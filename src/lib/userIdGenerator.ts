import mysql from 'mysql2/promise';

export interface UserIdGeneratorConfig {
  host: string;
  user: string;
  password: string;
  database: string;
}

export class UserIdGenerator {
  private config: UserIdGeneratorConfig;
  private connection: mysql.Connection | null = null;

  constructor(config: UserIdGeneratorConfig) {
    this.config = config;
  }

  /**
   * Generate a unique user ID in the format USR + exactly 3 digits (000-999)
   * @returns Promise<string> - Unique user ID (e.g., USR001, USR010, USR100, USR999)
   */
  async generateUserId(): Promise<string> {
    let connection: mysql.Connection | null = null;
    
    try {
      // Create database connection
      connection = await mysql.createConnection(this.config);
      
      // Start transaction for atomic operations
      await connection.beginTransaction();
      
      try {
        // Step 1: Get all existing user IDs from the database
        const [existingUsers] = await connection.execute(
          'SELECT user_id FROM users ORDER BY user_id FOR UPDATE'
        ) as [any[], any];
        
        // Step 2: Extract existing user numbers (handle both old and new formats)
        const existingUserNumbers = existingUsers
          .map((row: any) => row.user_id)
          .filter((userId: string) => userId.match(/^USR\d+$/))
          .map((userId: string) => {
            // Handle both old format (USR000010) and new format (USR10)
            const match = userId.match(/^USR(\d+)$/);
            if (!match) return 0;
            
            const numberStr = match[1];
            // Remove leading zeros to get the actual number
            const actualNumber = parseInt(numberStr.replace(/^0+/, '') || '0');
            return actualNumber;
          })
          .filter(num => num > 0 && num <= 999) // Only consider valid 3-digit numbers
          .sort((a: number, b: number) => a - b);
        
        console.log(`Existing user numbers: ${existingUserNumbers.join(', ')}`);
        
        // Step 3: Find the first available number in 1-999 range
        const nextUserNumber = this.findNextAvailableNumber(existingUserNumbers);
        
        // Step 4: Generate the user ID with exactly 3 digits (000-999)
        if (nextUserNumber > 999) {
          throw new Error('Maximum user ID limit reached (999)');
        }
        
        const userId = `USR${nextUserNumber.toString().padStart(3, '0')}`;
        
        // Step 5: Double-check this ID doesn't exist (race condition protection)
        const [existingUser] = await connection.execute(
          'SELECT user_id FROM users WHERE user_id = ?',
          [userId]
        ) as [any[], any];
        
        if (existingUser.length > 0) {
          // If ID exists, find the next available one
          const alternativeUserId = await this.findAlternativeUserId(connection, existingUserNumbers);
          await connection.commit();
          console.log(`Generated user ID: ${alternativeUserId} (alternative)`);
          return alternativeUserId;
        }
        
        // Step 6: Commit transaction
        await connection.commit();
        console.log(`Generated user ID: ${userId}`);
        return userId;
        
      } catch (error) {
        await connection.rollback();
        throw error;
      }
      
    } catch (error) {
      console.error('Error generating user ID:', error);
      throw new Error('Failed to generate unique user ID');
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  /**
   * Find the next available number in the sequence (1-999)
   * @param existingNumbers - Array of existing user numbers
   * @returns number - Next available number
   */
  private findNextAvailableNumber(existingNumbers: number[]): number {
    // If no existing users, start with 1
    if (existingNumbers.length === 0) {
      return 1;
    }
    
    // Simply return the next number after the maximum (sequential generation)
    const nextNumber = Math.max(...existingNumbers) + 1;
    if (nextNumber > 999) {
      throw new Error('Maximum user ID limit reached (999)');
    }
    
    return nextNumber;
  }

  /**
   * Find an alternative user ID if the proposed one already exists
   * @param connection - Database connection
   * @param existingNumbers - Array of existing user numbers
   * @returns Promise<string> - Alternative user ID
   */
  private async findAlternativeUserId(
    connection: mysql.Connection, 
    existingNumbers: number[]
  ): Promise<string> {
    let attemptNumber = Math.max(...existingNumbers) + 1;
    const maxAttempts = 100;
    
    while (attemptNumber <= Math.max(...existingNumbers) + maxAttempts && attemptNumber <= 999) {
      // Use exactly 3 digits format
      const alternativeUserId = `USR${attemptNumber.toString().padStart(3, '0')}`;
      
      const [checkExisting] = await connection.execute(
        'SELECT user_id FROM users WHERE user_id = ?',
        [alternativeUserId]
      ) as [any[], any];
      
      if (checkExisting.length === 0) {
        return alternativeUserId;
      }
      
      attemptNumber++;
    }
    
    throw new Error('Unable to generate unique user ID after maximum attempts or limit reached');
  }

  /**
   * Validate if a user ID format is correct
   * @param userId - User ID to validate
   * @returns boolean - True if valid format
   */
  static validateUserIdFormat(userId: string): boolean {
    return /^USR\d+$/.test(userId);
  }

  /**
   * Extract user number from user ID
   * @param userId - User ID (e.g., USR001)
   * @returns number - User number (e.g., 1)
   */
  static extractUserNumber(userId: string): number {
    const match = userId.match(/^USR(\d+)$/);
    if (!match) {
      throw new Error('Invalid user ID format');
    }
    return parseInt(match[1]);
  }

  /**
   * Get range information for a user number
   * @param userNumber - User number
   * @returns object - Range information
   */
  static getRangeInfo(userNumber: number): { rangeStart: number; rangeEnd: number; rangeNumber: number } {
    const rangeSize = 10;
    const rangeNumber = Math.ceil(userNumber / rangeSize);
    const rangeStart = (rangeNumber - 1) * rangeSize + 1;
    const rangeEnd = rangeNumber * rangeSize;
    
    return { rangeStart, rangeEnd, rangeNumber };
  }

  /**
   * Check if a user ID is available (doesn't exist in database)
   * @param userId - User ID to check
   * @returns Promise<boolean> - True if available
   */
  async isUserIdAvailable(userId: string): Promise<boolean> {
    let connection: mysql.Connection | null = null;
    
    try {
      connection = await mysql.createConnection(this.config);
      
      const [existingUser] = await connection.execute(
        'SELECT user_id FROM users WHERE user_id = ?',
        [userId]
      ) as [any[], any];
      
      return existingUser.length === 0;
      
    } catch (error) {
      console.error('Error checking user ID availability:', error);
      throw new Error('Failed to check user ID availability');
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  /**
   * Get statistics about user ID usage
   * @returns Promise<object> - Usage statistics
   */
  async getUserIdStatistics(): Promise<{
    totalUsers: number;
    usedRanges: number[];
    availableRanges: number[];
    nextAvailableNumber: number;
    gaps: number[];
  }> {
    let connection: mysql.Connection | null = null;
    
    try {
      connection = await mysql.createConnection(this.config);
      
      const [existingUsers] = await connection.execute(
        'SELECT user_id FROM users ORDER BY user_id'
      ) as [any[], any];
      
      const existingUserNumbers = existingUsers
        .map((row: any) => row.user_id)
        .filter((userId: string) => userId.match(/^USR\d+$/))
        .map((userId: string) => {
          // Handle both old format (USR000010) and new format (USR10)
          const match = userId.match(/^USR(\d+)$/);
          if (!match) return 0;
          
          const numberStr = match[1];
          // Remove leading zeros to get the actual number
          const actualNumber = parseInt(numberStr.replace(/^0+/, '') || '0');
          return actualNumber;
        })
        .filter(num => num > 0 && num <= 999) // Only consider valid 3-digit numbers
        .sort((a: number, b: number) => a - b);
      
      const totalUsers = existingUserNumbers.length;
      const nextAvailableNumber = this.findNextAvailableNumber(existingUserNumbers);
      
      // Find gaps in the sequence
      const gaps: number[] = [];
      for (let i = 1; i <= Math.max(...existingUserNumbers, 0); i++) {
        if (!existingUserNumbers.includes(i)) {
          gaps.push(i);
        }
      }
      
      // Calculate used and available ranges
      const usedRanges: number[] = [];
      const availableRanges: number[] = [];
      const maxRange = Math.ceil(Math.max(...existingUserNumbers, 0) / 10);
      
      for (let range = 1; range <= maxRange + 1; range++) {
        const rangeStart = (range - 1) * 10 + 1;
        const rangeEnd = range * 10;
        const rangeNumbers = existingUserNumbers.filter((num: number) => num >= rangeStart && num <= rangeEnd);
        
        if (rangeNumbers.length > 0) {
          usedRanges.push(range);
        } else {
          availableRanges.push(range);
        }
      }
      
      return {
        totalUsers,
        usedRanges,
        availableRanges,
        nextAvailableNumber,
        gaps
      };
      
    } catch (error) {
      console.error('Error getting user ID statistics:', error);
      throw new Error('Failed to get user ID statistics');
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
}

// Export a singleton instance for easy use
export const userIdGenerator = new UserIdGenerator({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'e_com_web'
});
