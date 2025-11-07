import { createPool, Pool } from 'mysql2/promise';

// Conservative global pool with minimal connections to prevent "Too many connections"
const pool: Pool = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'e_com_web',
  waitForConnections: true,
  connectionLimit: 10, // Increased from 5 to 10 for better performance
  queueLimit: 10, // Increased queue limit
  charset: 'utf8mb4',
  multipleStatements: false,
  // Shorter timeouts to release connections faster
  idleTimeout: 30000, // 30 seconds
  // Better connection handling
  enableKeepAlive: true,
  keepAliveInitialDelay: 5000,
});

pool.on('connection', (connection) => {
  connection.on('error', (err) => {
    console.error('Database connection error:', err);
  });
});

pool.on('acquire', (connection) => {
  console.log('🔗 Database connection acquired');
});

pool.on('release', (connection) => {
  console.log('🔗 Database connection released');
});

// Conservative concurrency limiter
let queriesInFlight = 0;
const MAX_CONCURRENT_QUERIES = 5; // Increased from 3 to 5 for better throughput
const waitQueue: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (queriesInFlight < MAX_CONCURRENT_QUERIES) {
    queriesInFlight++;
    return;
  }
  await new Promise<void>((resolve) => waitQueue.push(resolve));
  queriesInFlight++;
}

function releaseSlot(): void {
  queriesInFlight = Math.max(0, queriesInFlight - 1);
  const next = waitQueue.shift();
  if (next) next();
}

// Simplified retry logic with immediate fallback
async function queryWithRetry(sql: string, params?: any[], maxRetries: number = 2): Promise<any> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await acquireSlot();
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (error: any) {
      lastError = error;
      const code = error?.code;
      const isConnLimit = code === 'ER_CON_COUNT_ERROR' || code === 'ER_TOO_MANY_CONNECTIONS';
      
      if (isConnLimit) {
        console.warn(`DB connection limit hit (attempt ${attempt}/${maxRetries})`);
        // Don't reset pool on every error, just wait and retry
        if (attempt === 1) {
          console.log('⏳ Waiting for connections to be released...');
          await new Promise((r) => setTimeout(r, 2000)); // Wait 2 seconds
        }
      }
      
      if (attempt === maxRetries) {
        console.error('❌ Max retries reached for query:', sql.substring(0, 100));
        throw error;
      }
      
      // Simple backoff
      const delay = isConnLimit ? 3000 : 1000;
      console.log(`⏳ Retrying query in ${delay}ms (attempt ${attempt}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, delay));
    } finally {
      releaseSlot();
    }
  }
  throw lastError;
}

export async function query(sql: string, params?: any[]) {
  return queryWithRetry(sql, params);
}

export function getPoolStatus() {
  return {
    queriesInFlight,
    waitQueueLength: waitQueue.length,
    connectionLimit: (pool as any).config.connectionLimit,
    queueLimit: (pool as any).config.queueLimit,
    idleTimeout: (pool as any).config.idleTimeout,
  };
}

export async function getPoolStats() {
  try {
    const [processList] = await pool.query('SHOW PROCESSLIST') as any[];
    const userConnections = (processList as any[]).filter((conn: any) =>
      conn.User === (process.env.DB_USER || 'root')
    );
    return {
      totalConnections: (processList as any[]).length,
      userConnections: userConnections.length,
      queriesInFlight,
      waitQueueLength: waitQueue.length,
      poolConfig: {
        connectionLimit: (pool as any).config.connectionLimit,
        queueLimit: (pool as any).config.queueLimit,
      }
    };
  } catch (error) {
    console.error('Error getting pool stats:', error);
    return null;
  }
}

// Simplified pool reset function
export async function resetPool() {
  try {
    console.log('🔄 Resetting database pool...');
    await pool.end();
    
    // Recreate pool with optimized settings
    const newPool = createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'e_com_web',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 10,
      charset: 'utf8mb4',
      multipleStatements: false,
      idleTimeout: 30000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 5000,
    });
    
    // Replace global pool
    Object.assign(pool, newPool);
    console.log('✅ Database pool reset successfully');
  } catch (error) {
    console.error('❌ Error resetting pool:', error);
    throw error;
  }
}

export async function closePool() {
  try {
    await pool.end();
    console.log('✅ Database pool closed');
  } catch (error) {
    console.error('❌ Error closing pool:', error);
  }
}