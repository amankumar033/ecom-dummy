import mysql from 'mysql2/promise';

export interface OrderIdGenerator {
  generateOrderId(): Promise<string>;
}

export class DatabaseOrderIdGenerator implements OrderIdGenerator {
  private connection: mysql.Connection;

  constructor(connection: mysql.Connection) {
    this.connection = connection;
  }

  async generateOrderId(): Promise<string> {
    try {
      // Find the highest order ID number and increment by 1
      const [rows] = await this.connection.execute(
        'SELECT COALESCE(MAX(CAST(SUBSTRING(order_id, 4) AS UNSIGNED)), 0) AS max_number FROM e_com_web.orders WHERE order_id LIKE "ORD%"'
      );
      
      const maxNumber = (rows as any[])[0]?.max_number ?? 0;
      const nextNumber = Number(maxNumber) + 1;
      const orderId = `ORD${nextNumber}`;
      
      console.log(`Generated order ID: ${orderId} (previous max: ${maxNumber})`);
      return orderId;
    } catch (error) {
      console.error('Error generating order ID:', error);
      throw new Error('Failed to generate unique order ID');
    }
  }
}

export class FallbackOrderIdGenerator implements OrderIdGenerator {
  private static counter = 0;
  async generateOrderId(): Promise<string> {
    FallbackOrderIdGenerator.counter++;
    return `ORD${FallbackOrderIdGenerator.counter}`;
  }
}

