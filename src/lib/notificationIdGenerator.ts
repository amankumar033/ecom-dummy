import mysql from 'mysql2/promise';

export interface NotificationIdGeneratorConfig {
  host: string;
  user: string;
  password: string;
  database: string;
}

export class NotificationIdGenerator {
  private config: NotificationIdGeneratorConfig;
  private connection: mysql.Connection | null = null;

  constructor(config: NotificationIdGeneratorConfig) {
    this.config = config;
  }

  /**
   * Generate a unique integer notification ID
   * @returns Promise<number> - Unique notification ID (e.g., 1, 2, 3, etc.)
   */
  async generateNotificationId(): Promise<number> {
    let connection: mysql.Connection | null = null;
    
    try {
      // Create database connection
      connection = await mysql.createConnection(this.config);
      
      // Get the maximum notification ID from the database
      const [result] = await connection.execute(
        'SELECT MAX(id) as max_id FROM notifications'
      );
      
      const maxId = (result as any[])[0]?.max_id || 0;
      const nextId = maxId + 1;
      
      console.log(`Generated notification ID: ${nextId}`);
      return nextId;
      
    } catch (error) {
      console.error('Error generating notification ID:', error);
      // Fallback: use timestamp-based ID if the above fails
      const timestamp = Date.now();
      const fallbackId = Math.floor(timestamp / 1000) % 1000000; // Use last 6 digits of timestamp
      console.log(`Using fallback notification ID: ${fallbackId}`);
      return fallbackId;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  /**
   * Check if a notification ID exists in the database
   * @param notificationId - Notification ID to check
   * @returns Promise<boolean> - True if ID exists
   */
  async isNotificationIdExists(notificationId: number): Promise<boolean> {
    let connection: mysql.Connection | null = null;
    
    try {
      connection = await mysql.createConnection(this.config);
      
      const [result] = await connection.execute(
        'SELECT id FROM notifications WHERE id = ?',
        [notificationId]
      );
      
      return (result as any[]).length > 0;
      
    } catch (error) {
      console.error('Error checking notification ID existence:', error);
      throw new Error('Failed to check notification ID existence');
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  /**
   * Find the next available notification ID
   * @returns Promise<number> - Next available notification ID
   */
  async findNextAvailableId(): Promise<number> {
    let connection: mysql.Connection | null = null;
    
    try {
      connection = await mysql.createConnection(this.config);
      
      // Get all existing IDs
      const [result] = await connection.execute(
        'SELECT id FROM notifications ORDER BY id'
      );
      
      const existingIds = (result as any[]).map(row => row.id).sort((a: number, b: number) => a - b);
      
      // If no existing notifications, start with 1
      if (existingIds.length === 0) {
        return 1;
      }
      
      // Find the first gap in the sequence
      for (let i = 1; i <= Math.max(...existingIds); i++) {
        if (!existingIds.includes(i)) {
          return i;
        }
      }
      
      // If no gaps, return the next number after the maximum
      return Math.max(...existingIds) + 1;
      
    } catch (error) {
      console.error('Error finding next available ID:', error);
      throw new Error('Failed to find next available ID');
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  /**
   * Get statistics about notification ID usage
   * @returns Promise<object> - Usage statistics
   */
  async getNotificationIdStatistics(): Promise<{
    totalNotifications: number;
    maxId: number;
    minId: number;
    gaps: number[];
    nextAvailableId: number;
  }> {
    let connection: mysql.Connection | null = null;
    
    try {
      connection = await mysql.createConnection(this.config);
      
      const [result] = await connection.execute(
        'SELECT id FROM notifications ORDER BY id'
      );
      
      const existingIds = (result as any[]).map(row => row.id).sort((a: number, b: number) => a - b);
      
      const totalNotifications = existingIds.length;
      const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
      const minId = existingIds.length > 0 ? Math.min(...existingIds) : 0;
      const nextAvailableId = await this.findNextAvailableId();
      
      // Find gaps in the sequence
      const gaps: number[] = [];
      for (let i = 1; i <= maxId; i++) {
        if (!existingIds.includes(i)) {
          gaps.push(i);
        }
      }
      
      return {
        totalNotifications,
        maxId,
        minId,
        gaps,
        nextAvailableId
      };
      
    } catch (error) {
      console.error('Error getting notification ID statistics:', error);
      throw new Error('Failed to get notification ID statistics');
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  /**
   * Create a notification with auto-generated integer ID
   * @param notificationData - Notification data
   * @returns Promise<number> - Generated notification ID
   */
  async createNotification(notificationData: {
    user_id: string;
    notification_type: string;
    title: string;
    message: string;
    is_read?: boolean;
  }): Promise<number> {
    let connection: mysql.Connection | null = null;
    
    try {
      connection = await mysql.createConnection(this.config);
      
      // Try up to 5 times to generate a unique ID
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          // Generate unique notification ID
          const notificationId = await this.findNextAvailableId();
          
          // Double-check that the ID doesn't exist (race condition protection)
          const exists = await this.isNotificationIdExists(notificationId);
          if (exists) {
            console.log(`ID ${notificationId} already exists, trying next...`);
            continue;
          }
          
          // Insert notification with generated ID
          await connection.execute(
            `INSERT INTO notifications (
              id, user_id, type, title, message, is_read, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              notificationId,
              notificationData.user_id,
              notificationData.notification_type,
              notificationData.title,
              notificationData.message,
              notificationData.is_read || false,
              new Date()
            ]
          );
          
          console.log(`✅ Created notification with ID: ${notificationId}`);
          return notificationId;
          
        } catch (insertError: any) {
          // If it's a duplicate key error, try again with a different ID
          if (insertError.code === 'ER_DUP_ENTRY' && attempt < 5) {
            console.log(`Duplicate key error, retrying... (attempt ${attempt})`);
            continue;
          }
          throw insertError;
        }
      }
      
      throw new Error('Failed to create notification after 5 attempts');
      
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
}

// Export a singleton instance for easy use
export const notificationIdGenerator = new NotificationIdGenerator({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'e_com_web'
});
