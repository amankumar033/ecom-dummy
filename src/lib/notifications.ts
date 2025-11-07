import { query } from './db';
import { sendDealerOrderNotificationEmail, sendVendorServiceNotificationEmail } from './email';

export interface NotificationData {
  type: string;
  title: string;
  message: string;
  description: string; // Detailed information (long-form)
  for_admin?: boolean | number;
  for_dealer?: boolean | number;
  for_vendor?: boolean | number;
  dealer_id?: string;
  vendor_id?: string;
  user_id?: string;
  metadata?: any;
}

type RecipientType = 'admin' | 'customer' | 'dealer' | 'vendor';
type RecipientTemplate = { title: string; message: string; description: (data: any) => string };
type NotificationTemplates = Record<string, Partial<Record<RecipientType, RecipientTemplate>>>;

// Notification templates for different types
export const NOTIFICATION_TEMPLATES: NotificationTemplates = {
  // User registration notifications
  user_registered: {
    admin: {
      title: 'New User Registration',
      message: 'New user registered',
      description: (data: any) => `A new user has registered on the platform. User details: ${data.user_name} (${data.user_email}). Registration date: ${data.registration_date}.`
    },
    customer: {
      title: 'Welcome to Easy Commerce',
      message: 'Account created successfully',
      description: (data: any) => `Welcome to Easy Commerce! Your account has been successfully created. You can now browse products, book services, and manage your automotive needs. Account email: ${data.user_email}.`
    }
  },

  // Order notifications
  order_created: {
    admin: {
      title: 'New Order Placed',
      message: 'New order received',
      description: (data: any) => `A new order has been placed by ${data.customer_name} for ₹${data.total_amount.toFixed(2)}. Order ID: ${data.order_id}. Items: ${data.items_count} products. Payment method: ${data.payment_method}.`
    },
    customer: {
      title: 'Order Confirmation',
      message: 'Order placed successfully',
      description: (data: any) => `Your order has been successfully placed! Order ID: ${data.order_id}. Total amount: ₹${data.total_amount.toFixed(2)}. Expected delivery: ${data.expected_delivery}. Payment status: ${data.payment_status}.`
    },
    dealer: {
      title: 'New Order for Your Products',
      message: 'New order received',
      description: (data: any) => `A new order has been placed for your products. Order ID: ${data.order_id}. Customer: ${data.customer_name}. Total amount: ₹${data.total_amount.toFixed(2)}. Items: ${data.items_count} products.`
    }
  },


  // Payment notifications
  payment_successful: {
    admin: {
      title: 'Payment Received',
      message: 'Payment successful',
      description: (data: any) => `Payment of ₹${data.amount.toFixed(2)} has been received for ${data.order_type} ${data.order_id}. Payment method: ${data.payment_method}. Transaction ID: ${data.transaction_id}.`
    },
    customer: {
      title: 'Payment Confirmation',
      message: 'Payment successful',
      description: (data: any) => `Your payment of ₹${data.amount.toFixed(2)} has been successfully processed for ${data.order_type} ${data.order_id}. Payment method: ${data.payment_method}. Transaction ID: ${data.transaction_id}.`
    }
  },

  // Status update notifications
  order_status_updated: {
    admin: {
      title: 'Order Status Updated',
      message: 'Order status changed',
      description: (data: any) => `Order ${data.order_id} status has been updated to "${data.new_status}" by ${data.updated_by}. Previous status: ${data.previous_status}.`
    },
    customer: {
      title: 'Order Status Update',
      message: 'Order status updated',
      description: (data: any) => `Your order ${data.order_id} status has been updated to "${data.new_status}". Expected delivery: ${data.expected_delivery}. Track your order for real-time updates.`
    }
  },


  // Review notifications
  review_submitted: {
    admin: {
      title: 'New Review Submitted',
      message: 'New review received',
      description: (data: any) => `A new review has been submitted by ${data.customer_name} for ${data.item_name}. Rating: ${data.rating}/5 stars. Review: ${data.review_text.substring(0, 100)}...`
    },
    dealer: {
      title: 'New Product Review',
      message: 'New review received',
      description: (data: any) => `A new review has been submitted for your product ${data.item_name} by ${data.customer_name}. Rating: ${data.rating}/5 stars. Review: ${data.review_text.substring(0, 100)}...`
    },
    vendor: {
      title: 'New Service Review',
      message: 'New review received',
      description: (data: any) => `A new review has been submitted for your service ${data.service_name} by ${data.customer_name}. Rating: ${data.rating}/5 stars. Review: ${data.review_text.substring(0, 100)}...`
    }
  }
};

// Helpers to standardize content
const getISTTimestamps = () => {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const yyyy = ist.getFullYear();
  const mm = String(ist.getMonth() + 1).padStart(2, '0');
  const dd = String(ist.getDate()).padStart(2, '0');
  const hh = String(ist.getHours()).padStart(2, '0');
  const mi = String(ist.getMinutes()).padStart(2, '0');
  const ss = String(ist.getSeconds()).padStart(2, '0');
  return {
    createdAt: `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`,
    createdTime: `${hh}:${mi}:${ss}`
  };
};

let hasCreatedTimeColumn: boolean | null = null;
const ensureCreatedTimeColumnExists = async (): Promise<boolean> => {
  if (hasCreatedTimeColumn !== null) return hasCreatedTimeColumn;
  try {
    const rows = await query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'created_time'`
    ) as any[];
    hasCreatedTimeColumn = Array.isArray(rows) && rows.length > 0;
  } catch {
    hasCreatedTimeColumn = false;
  }
  return hasCreatedTimeColumn as boolean;
};
const truncateMessage = (text: string, maxLength: number = 120): string => {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
};

const toTwoDecimals = (value: any): string => {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : String(value ?? '');
};

const buildDescriptionFromMetadata = (
  title: string,
  message: string,
  metadata?: any
): string => {
  try {
    const parts: string[] = [];

    if (metadata && typeof metadata === 'object') {
      // Basic order/service information
      if (metadata.order_id) parts.push(`Order ID: ${metadata.order_id}.`);
      if (metadata.service_order_id) parts.push(`Service Order ID: ${metadata.service_order_id}.`);
      
      // Enhanced customer information
      if (metadata.customer_details) {
        const customer = metadata.customer_details;
        parts.push(`Customer: ${customer.name || metadata.customer_name}.`);
        if (customer.phone) parts.push(`Phone: ${customer.phone}.`);
        if (customer.email) parts.push(`Email: ${customer.email}.`);
        if (customer.user_id) parts.push(`User ID: ${customer.user_id}.`);
      } else {
        if (metadata.customer_name) parts.push(`Customer: ${metadata.customer_name}.`);
        if (metadata.customer_email) parts.push(`Email: ${metadata.customer_email}.`);
        if (metadata.customer_phone) parts.push(`Phone: ${metadata.customer_phone}.`);
        if (metadata.user_id) parts.push(`User ID: ${metadata.user_id}.`);
      }
      
      // Price information
      if (metadata.price_breakdown) {
        const price = metadata.price_breakdown;
        parts.push(`Price: ₹${toTwoDecimals(price.total || price.final_price)}.`);
        if (price.subtotal && price.subtotal !== price.total) parts.push(`Subtotal: ₹${toTwoDecimals(price.subtotal)}.`);
        if (price.tax && price.tax > 0) parts.push(`Tax: ₹${toTwoDecimals(price.tax)}.`);
        if (price.discount && price.discount > 0) parts.push(`Discount: ₹${toTwoDecimals(price.discount)}.`);
      } else {
        if (metadata.total_amount) parts.push(`Total: ₹${toTwoDecimals(metadata.total_amount)}.`);
        if (metadata.final_price) parts.push(`Amount: ₹${toTwoDecimals(metadata.final_price)}.`);
      }
      
      // Status information
      if (metadata.order_status) parts.push(`Status: ${metadata.order_status}.`);
      if (metadata.service_status) parts.push(`Service Status: ${metadata.service_status}.`);
      if (metadata.payment_status) parts.push(`Payment: ${metadata.payment_status}.`);
      
      // Service information
      if (metadata.service_name) parts.push(`Service: ${metadata.service_name}.`);
      if (metadata.service_category) parts.push(`Category: ${metadata.service_category}.`);
      if (metadata.service_type) parts.push(`Type: ${metadata.service_type}.`);
      if (metadata.service_duration) parts.push(`Duration: ${metadata.service_duration} minutes.`);
      
      // Enhanced multiple product/order information
      if (metadata.is_multiple_orders && metadata.total_orders && metadata.total_orders > 1) {
        parts.push(`Multiple Orders: ${metadata.total_orders} orders.`);
      }
      if (metadata.is_multiple_products && metadata.total_items && metadata.total_items > 1) {
        parts.push(`Multiple Products: ${metadata.total_items} items.`);
      }
      if (metadata.order_ids && Array.isArray(metadata.order_ids) && metadata.order_ids.length > 1) {
        parts.push(`Order IDs: ${metadata.order_ids.map((id: string) => `#${id}`).join(', ')}.`);
      }
      if (metadata.product_details && Array.isArray(metadata.product_details) && metadata.product_details.length > 0) {
        const productSummary = metadata.product_details.map((product: any) => 
          `${product.product_name} (Qty: ${product.quantity})`
        ).join(', ');
        parts.push(`Products: ${productSummary}.`);
      }
      if (metadata.items && Array.isArray(metadata.items)) {
        if (metadata.items.length > 1) {
          const itemSummary = metadata.items.map((item: any) => 
            `${item.name || item.product_name} (Qty: ${item.quantity})`
          ).join(', ');
          parts.push(`Items: ${itemSummary}.`);
        } else {
          parts.push(`Items: ${metadata.items.length}.`);
        }
      }
      
      // Address information
      if (metadata.customer_details?.address) {
        const customer = metadata.customer_details;
        parts.push(`Address: ${customer.address}${customer.pincode ? `, ${customer.pincode}` : ''}.`);
      } else if (metadata.shipping_address || metadata.service_address) {
        const addr = metadata.shipping_address || metadata.service_address;
        const pin = metadata.shipping_pincode || metadata.service_pincode;
        parts.push(`Address: ${addr}${pin ? `, ${pin}` : ''}.`);
      }
      
      // Enhanced date and time information
      if (metadata.order_date) parts.push(`Order Date: ${metadata.order_date}.`);
      if (metadata.order_time) parts.push(`Order Time: ${metadata.order_time}.`);
      if (metadata.booking_date) parts.push(`Booking Date: ${metadata.booking_date}.`);
      if (metadata.booking_time) parts.push(`Booking Time: ${metadata.booking_time}.`);
      if (metadata.service_date) parts.push(`Service Date: ${metadata.service_date}.`);
      if (metadata.service_time) parts.push(`Service Time: ${metadata.service_time}.`);
      
      // Dealer/Vendor information
      if (metadata.dealer_details) {
        const dealer = metadata.dealer_details;
        parts.push(`Dealer: ${dealer.dealer_name}${dealer.dealer_id ? ` (ID: ${dealer.dealer_id})` : ''}.`);
      }
      if (metadata.vendor_name) {
        parts.push(`Vendor: ${metadata.vendor_name}${metadata.vendor_id ? ` (ID: ${metadata.vendor_id})` : ''}.`);
      }
      
      // Additional notes
      if (metadata.additional_notes && metadata.additional_notes.trim()) {
        parts.push(`Notes: ${metadata.additional_notes}.`);
      }
    }

    const summary = parts.join(' ');
    return summary || `${title}. ${message}`;
  } catch {
    return `${title}. ${message}`;
  }
};

export const createNotification = async (notificationData: NotificationData): Promise<boolean> => {
  try {
    const {
      type,
      title,
      message,
      description,
      for_admin = false,
      for_dealer = false,
      for_vendor = false,
      dealer_id,
      vendor_id,
      user_id,
      metadata
    } = notificationData;

    // Ensure small message and always-present description
    const finalMessage = truncateMessage(message || title || 'Notification');
    const finalDescription = description && description.trim().length > 0
      ? description
      : buildDescriptionFromMetadata(title, message, metadata);

    console.log('🔔 Creating notification:', {
      type,
      title,
      message: finalMessage.substring(0, 50) + '...', // Log first 50 chars
      description: finalDescription ? finalDescription.substring(0, 50) + '...' : 'No description',
      for_admin,
      for_dealer,
      for_vendor,
      dealer_id,
      vendor_id,
      user_id
    });

    const { createdAt, createdTime } = getISTTimestamps();
    const includeTime = await ensureCreatedTimeColumnExists();
    const sql = includeTime
      ? `INSERT INTO notifications (
           type, title, message, description, for_admin, for_dealer, for_vendor,
           dealer_id, vendor_id, user_id, metadata, created_at, created_time
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      : `INSERT INTO notifications (
           type, title, message, description, for_admin, for_dealer, for_vendor,
           dealer_id, vendor_id, user_id, metadata, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = includeTime
      ? [
          type,
          title,
          finalMessage,
          finalDescription || null,
          for_admin ? 1 : 0,
          for_dealer ? 1 : 0,
          for_vendor ? 1 : 0,
          dealer_id || null,
          vendor_id || null,
          user_id || null,
          metadata ? JSON.stringify(metadata) : null,
          createdAt,
          createdTime
        ]
      : [
          type,
          title,
          finalMessage,
          finalDescription || null,
          for_admin ? 1 : 0,
          for_dealer ? 1 : 0,
          for_vendor ? 1 : 0,
          dealer_id || null,
          vendor_id || null,
          user_id || null,
          metadata ? JSON.stringify(metadata) : null,
          createdAt
        ];

    const result = await query(sql, params) as any;

    console.log('✅ Notification created successfully:', title);
    console.log('📝 Notification result:', result);
    
    return true;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return false;
  }
};

// Helper function to create notifications using templates
export const createNotificationWithTemplate = async (
  notificationType: keyof typeof NOTIFICATION_TEMPLATES,
  recipientType: 'admin' | 'customer' | 'dealer' | 'vendor',
  data: any,
  additionalOptions: {
    user_id?: string;
    dealer_id?: string;
    vendor_id?: string;
    metadata?: any;
  } = {}
): Promise<boolean> => {
  try {
    const template = NOTIFICATION_TEMPLATES[notificationType][recipientType];
    if (!template) {
      console.error(`❌ No template found for ${notificationType}.${recipientType}`);
      return false;
    }

    const notificationData: NotificationData = {
      type: notificationType,
      title: template.title,
      message: template.message,
      description: template.description(data),
      for_admin: recipientType === 'admin' ? 1 : 0,
      for_dealer: recipientType === 'dealer' ? 1 : 0,
      for_vendor: recipientType === 'vendor' ? 1 : 0,
      user_id: recipientType === 'customer' ? additionalOptions.user_id : undefined,
      dealer_id: recipientType === 'dealer' ? additionalOptions.dealer_id : undefined,
      vendor_id: recipientType === 'vendor' ? additionalOptions.vendor_id : undefined,
      metadata: additionalOptions.metadata
    };

    return await createNotification(notificationData);
  } catch (error) {
    console.error('❌ Error creating notification with template:', error);
    return false;
  }
};

// Helper function to create multiple notifications for different recipients
export const createMultiRecipientNotifications = async (
  notificationType: keyof typeof NOTIFICATION_TEMPLATES,
  recipients: Array<'admin' | 'customer' | 'dealer' | 'vendor'>,
  data: any,
  additionalOptions: {
    user_id?: string;
    dealer_id?: string;
    vendor_id?: string;
    metadata?: any;
  } = {}
): Promise<{ [key: string]: boolean }> => {
  const results: { [key: string]: boolean } = {};

  for (const recipient of recipients) {
    results[recipient] = await createNotificationWithTemplate(
      notificationType,
      recipient,
      data,
      additionalOptions
    );
  }

  return results;
};

export const createOrderNotifications = async (
  orderData: any,
  orderId: string,
  dealerId: string | null
): Promise<void> => {
  console.log('🔔 Creating order notifications for:', {
    orderId,
    dealerId,
    customerName: orderData.customer_name,
    totalAmount: orderData.total_amount
  });

  const { createdAt: currentTime } = getISTTimestamps();
  
  // Determine if this is multiple orders or single order with multiple products
  // If we have multiple products and the system is designed to create separate orders for each product,
  // we should treat this as multiple orders even if order_ids array is not populated yet
  const hasMultipleProducts = orderData.items && orderData.items.length > 1;
  const isMultipleOrders = (orderData.order_ids && orderData.order_ids.length > 1) || 
                          (hasMultipleProducts && orderData.is_multiple_products);
  
  // Prepare order metadata with enhanced details for multiple products/orders
  const orderMetadata = {
    order_id: orderId,
    customer_name: orderData.customer_name,
    customer_email: orderData.customer_email,
    customer_phone: orderData.customer_phone,
    user_id: orderData.user_id,
    total_amount: orderData.total_amount,
    order_status: orderData.order_status,
    payment_status: orderData.payment_status,
    order_date: currentTime,
    order_time: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
    items: orderData.items || [],
    shipping_address: orderData.shipping_address,
    shipping_pincode: orderData.shipping_pincode,
    // Enhanced metadata for multiple products/orders
    total_orders: isMultipleOrders ? (orderData.order_ids ? orderData.order_ids.length : orderData.items.length) : 1,
    total_items: orderData.total_items || (orderData.items ? orderData.items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) : 1),
    order_ids: isMultipleOrders ? (orderData.order_ids && orderData.order_ids.length > 1 ? orderData.order_ids : [orderId]) : [orderId],
    product_details: orderData.product_details || (orderData.items ? orderData.items.map((item: any) => ({
      product_id: item.product_id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: (item.price || 0) * (item.quantity || 1),
      product_image: item.image_1 || null
    })) : []),
    dealer_details: orderData.dealer_name ? {
      dealer_name: orderData.dealer_name,
      dealer_id: dealerId,
      dealer_email: orderData.dealer_email
    } : null,
    // Price breakdown
    price_breakdown: {
      subtotal: orderData.subtotal || orderData.total_amount,
      tax: orderData.tax || 0,
      shipping: orderData.shipping || 0,
      discount: orderData.discount || 0,
      total: orderData.total_amount
    },
    // Customer details
    customer_details: {
      name: orderData.customer_name,
      email: orderData.customer_email,
      phone: orderData.customer_phone,
      user_id: orderData.user_id,
      address: orderData.shipping_address,
      pincode: orderData.shipping_pincode
    },
    is_multiple_orders: isMultipleOrders,
    is_multiple_products: hasMultipleProducts
  };

  console.log('📋 Order metadata prepared:', orderMetadata);

  // Create admin notification with enhanced description for multiple products/orders
  console.log('👨‍💼 Creating admin notification...');
  
  // Enhanced admin notification description with user ID and dealer details
  const userInfo = orderData.user_id ? `[User ID: ${orderData.user_id}]` : '';
  const dealerInfo = orderData.dealer_name ? `Dealer: ${orderData.dealer_name} (ID: ${orderData.dealer_id || 'N/A'})` : 'Dealer: Not assigned';
  
  const adminDescription = `A new order #${orderId} has been created by ${orderData.customer_name} ${userInfo} for ₹${toTwoDecimals(orderData.total_amount)}. ` +
    `Status: ${orderData.order_status}. Payment: ${orderData.payment_status}. ` +
    `Ship to: ${orderData.shipping_address}, ${orderData.shipping_pincode}. ` +
    `Product: ${orderData.items && orderData.items.length > 0 ? orderData.items[0].name : 'N/A'} (Qty: ${orderData.items && orderData.items.length > 0 ? orderData.items[0].quantity : 1}). ` +
    `${dealerInfo}.`;

  const adminSuccess = await createNotification({
    type: 'order_placed',
    title: `New Order #${orderId} - ${orderData.customer_name}`,
    message: `Order placed for ${orderData.items && orderData.items.length > 0 ? orderData.items[0].name : 'product'} - ₹${toTwoDecimals(orderData.total_amount)}`,
    description: adminDescription,
    for_admin: true,
    for_dealer: false,
    for_vendor: false,
    metadata: orderMetadata
  });

  if (adminSuccess) {
    console.log('✅ Admin notification created successfully');
  } else {
    console.log('❌ Failed to create admin notification');
  }

  // Create dealer notification and send email (if dealer exists and is valid)
  if (dealerId) {
    console.log('🏪 Creating dealer notification for dealer:', dealerId);
    
          // First check if the dealer exists and get their details
      try {
        const dealerCheck = await query(
          'SELECT dealer_id, business_name, email FROM dealers WHERE dealer_id = ?',
          [dealerId]
        ) as any[];
      
      if (dealerCheck.length === 0) {
        console.log('⚠️ Dealer ID does not exist in dealers table, skipping dealer notification');
        return;
      }
      
      const dealer = dealerCheck[0];
      console.log('📧 Dealer details found:', { name: dealer.business_name, email: dealer.email });
      
      // Enhanced dealer notification description with customer details
      const customerInfo = orderData.user_id ? `[Customer ID: ${orderData.user_id}]` : '';
      
      const dealerDescription = `Order #${orderId} placed for your products by ${orderData.customer_name} ${customerInfo} for ₹${toTwoDecimals(orderData.total_amount)}. ` +
        `Status: ${orderData.order_status}. Payment: ${orderData.payment_status}. ` +
        `Ship to: ${orderData.shipping_address}, ${orderData.shipping_pincode}. ` +
        `Product: ${orderData.items && orderData.items.length > 0 ? orderData.items[0].name : 'N/A'} (Qty: ${orderData.items && orderData.items.length > 0 ? orderData.items[0].quantity : 1}). ` +
        `Customer Contact: ${orderData.customer_email}${orderData.customer_phone ? `, ${orderData.customer_phone}` : ''}.`;

      const dealerSuccess = await createNotification({
        type: 'order_placed',
        title: `New Order #${orderId} - ${orderData.customer_name}`,
        message: `Order for ${orderData.items && orderData.items.length > 0 ? orderData.items[0].name : 'your product'} - ₹${toTwoDecimals(orderData.total_amount)}`,
        description: dealerDescription,
        for_admin: false,
        for_dealer: true,
        for_vendor: false,
        dealer_id: dealerId,
        metadata: orderMetadata
      });

      if (dealerSuccess) {
        console.log('✅ Dealer notification created successfully');
      } else {
        console.log('❌ Failed to create dealer notification');
      }

      // Send email to dealer if email exists
      if (dealer.email) {
        console.log('📧 Sending order notification email to dealer:', dealer.email);
        try {
          const dealerEmailData = {
            order_id: orderId,
            dealer_name: dealer.business_name,
            dealer_email: dealer.email,
            customer_name: orderData.customer_name,
            customer_email: orderData.customer_email,
            customer_phone: orderData.customer_phone,
            total_amount: orderData.total_amount,
            order_date: orderData.order_date || currentTime,
            order_status: orderData.order_status,
            payment_status: orderData.payment_status,
            shipping_address: orderData.shipping_address,
            shipping_pincode: orderData.shipping_pincode,
            items: orderData.items || [],
            // Enhanced data for multiple products/orders
            orders: orderData.orders || [],
            total_orders: orderMetadata.total_orders,
            total_items: orderMetadata.total_items,
            order_ids: orderMetadata.order_ids,
            product_details: orderMetadata.product_details,
            is_multiple_orders: orderMetadata.is_multiple_orders,
            is_multiple_products: orderMetadata.is_multiple_products
          };

          console.log('📧 Attempting to send dealer order notification email to:', dealer.email);
          const emailSent = await sendDealerOrderNotificationEmail(dealerEmailData);
          if (emailSent) {
            console.log('✅ Dealer order notification email sent successfully to:', dealer.email);
          } else {
            console.log('❌ Failed to send dealer order notification email to:', dealer.email);
          }
        } catch (emailError) {
          console.error('❌ Error sending dealer order notification email:', emailError);
          console.error('❌ Email error details:', {
            message: emailError instanceof Error ? emailError.message : 'Unknown error',
            stack: emailError instanceof Error ? emailError.stack : undefined
          });
        }
      } else {
        console.log('⚠️ Dealer email not found, skipping email notification');
      }
    } catch (error) {
      console.error('❌ Error checking dealer or creating dealer notification:', error);
      console.log('⚠️ Skipping dealer notification due to error');
    }
  } else {
    console.log('ℹ️ No dealer ID provided, skipping dealer notification');
  }

  console.log('🏁 Order notification creation completed');
};

// Function to create notifications for multiple orders (each product gets its own order ID)
export const createMultipleOrderNotifications = async (
  orderData: any,
  dealerId: string | null
): Promise<void> => {
  console.log('🔔 Creating multiple order notifications for:', {
    customerName: orderData.customer_name,
    totalAmount: orderData.total_amount,
    totalItems: orderData.total_items
  });

  const { createdAt: currentTime } = getISTTimestamps();
  
  // Generate individual order IDs for each product if not provided
  const orderIds = orderData.order_ids || [];
  const items = orderData.items || [];
  
  // If we have items but no order IDs, we need to generate them
  if (items.length > 0 && orderIds.length === 0) {
    console.log('⚠️ No order IDs provided, but items exist. This should be handled by the calling function.');
  }
  
  // Prepare comprehensive metadata for multiple orders
  const orderMetadata = {
    primary_order_id: orderData.order_id || orderIds[0],
    customer_name: orderData.customer_name,
    customer_email: orderData.customer_email,
    total_amount: orderData.total_amount,
    order_status: orderData.order_status,
    payment_status: orderData.payment_status,
    order_date: currentTime,
    items: items,
    shipping_address: orderData.shipping_address,
    shipping_pincode: orderData.shipping_pincode,
    // Enhanced metadata for multiple orders
    total_orders: orderIds.length,
    total_items: orderData.total_items,
    order_ids: orderIds,
    product_details: orderData.product_details || items.map((item: any) => ({
      product_id: item.product_id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: (item.price || 0) * (item.quantity || 1)
    })),
    dealer_details: orderData.dealer_name ? {
      dealer_name: orderData.dealer_name,
      dealer_id: dealerId
    } : null,
    is_multiple_orders: orderIds.length > 1,
    is_multiple_products: items.length > 1
  };

  console.log('📋 Multiple order metadata prepared:', orderMetadata);

  // Create single admin notification for all orders
  console.log('👨‍💼 Creating admin notification for multiple orders...');
  
  const adminDescription = `Multiple orders have been created by ${orderData.customer_name} for ₹${toTwoDecimals(orderData.total_amount)}. ` +
    `Status: ${orderData.order_status}. Payment: ${orderData.payment_status}. ` +
    `Ship to: ${orderData.shipping_address}, ${orderData.shipping_pincode}. ` +
    `Total Orders: ${orderIds.length}. Total Items: ${orderData.total_items}. ` +
    `Order IDs: ${orderIds.map((id: string) => `#${id}`).join(', ')}. ` +
    `Products: ${orderData.product_details ? orderData.product_details.map((product: any) => `${product.product_name} (Qty: ${product.quantity})`).join(', ') : 'N/A'}.`;

  const adminSuccess = await createNotification({
    type: 'orders_placed',
    title: 'Multiple Orders Created',
    message: 'Multiple orders received',
    description: adminDescription,
    for_admin: true,
    for_dealer: false,
    for_vendor: false,
    metadata: orderMetadata
  });

  if (adminSuccess) {
    console.log('✅ Admin notification for multiple orders created successfully');
  } else {
    console.log('❌ Failed to create admin notification for multiple orders');
  }

  // Create dealer notification if dealer exists
  if (dealerId) {
    console.log('🏪 Creating dealer notification for multiple orders...');
    
    try {
      const dealerCheck = await query(
        'SELECT dealer_id, business_name, email FROM `Easy Commerce`.dealers WHERE dealer_id = ?',
        [dealerId]
      ) as any[];
    
      if (dealerCheck.length === 0) {
        console.log('⚠️ Dealer ID does not exist in dealers table, skipping dealer notification');
        return;
      }
      
      const dealer = dealerCheck[0];
      console.log('📧 Dealer details found:', { name: dealer.business_name, email: dealer.email });
      
      // Create dealer notification for multiple orders
      const dealerDescription = `Multiple orders have been placed for your products by ${orderData.customer_name} for ₹${toTwoDecimals(orderData.total_amount)}. ` +
        `Status: ${orderData.order_status}. Payment: ${orderData.payment_status}. ` +
        `Ship to: ${orderData.shipping_address}, ${orderData.shipping_pincode}. ` +
        `Total Orders: ${orderIds.length}. Total Items: ${orderData.total_items}. ` +
        `Order IDs: ${orderIds.map((id: string) => `#${id}`).join(', ')}. ` +
        `Products: ${orderData.product_details ? orderData.product_details.map((product: any) => `${product.product_name} (Qty: ${product.quantity})`).join(', ') : 'N/A'}.`;

      const dealerSuccess = await createNotification({
        type: 'orders_placed',
        title: 'Multiple Orders for Your Products',
        message: 'Multiple orders for your products',
        description: dealerDescription,
        for_admin: false,
        for_dealer: true,
        for_vendor: false,
        dealer_id: dealerId,
        metadata: orderMetadata
      });

      if (dealerSuccess) {
        console.log('✅ Dealer notification for multiple orders created successfully');
      } else {
        console.log('❌ Failed to create dealer notification for multiple orders');
      }

      // Send email to dealer if email exists
      if (dealer.email) {
        console.log('📧 Sending multiple order notification email to dealer:', dealer.email);
        try {
          const dealerEmailData = {
            order_id: orderData.order_id || orderIds[0],
            dealer_name: dealer.business_name,
            dealer_email: dealer.email,
            customer_name: orderData.customer_name,
            customer_email: orderData.customer_email,
            customer_phone: orderData.customer_phone,
            total_amount: orderData.total_amount,
            order_date: orderData.order_date || currentTime,
            order_status: orderData.order_status,
            payment_status: orderData.payment_status,
            shipping_address: orderData.shipping_address,
            shipping_pincode: orderData.shipping_pincode,
            items: items,
            // Enhanced data for multiple orders
            orders: orderData.orders || [],
            total_orders: orderIds.length,
            total_items: orderData.total_items,
            order_ids: orderIds,
            product_details: orderData.product_details,
            is_multiple_orders: true,
            is_multiple_products: items.length > 1
          };

          console.log('📧 Attempting to send dealer multiple order notification email to:', dealer.email);
          const emailSent = await sendDealerOrderNotificationEmail(dealerEmailData);
          if (emailSent) {
            console.log('✅ Dealer multiple order notification email sent successfully to:', dealer.email);
          } else {
            console.log('❌ Failed to send dealer multiple order notification email to:', dealer.email);
          }
        } catch (emailError) {
          console.error('❌ Error sending dealer multiple order notification email:', emailError);
        }
      } else {
        console.log('⚠️ Dealer email not found, skipping email notification');
      }
    } catch (error) {
      console.error('❌ Error checking dealer or creating dealer notification:', error);
      console.log('⚠️ Skipping dealer notification due to error');
    }
  } else {
    console.log('ℹ️ No dealer ID provided, skipping dealer notification');
  }

  console.log('🏁 Multiple order notification creation completed');
};



  const { createdAt: currentTime } = getISTTimestamps();
  


  

// Create notifications for order cancellation
export const createOrderCancellationNotifications = async (
  orderData: any,
  orderId: string,
  dealerId?: string
) => {
  console.log('🚀 Creating order cancellation notifications...');
  console.log('📋 Order data:', { orderId, dealerId, customer: orderData.customer_name });

  // Prepare metadata for notifications
  const orderMetadata = {
    order_id: orderId,
    customer_name: orderData.customer_name,
    customer_email: orderData.customer_email,
    total_amount: orderData.total_amount,
    items_count: orderData.items?.length || 1,
    order_date: orderData.order_date,
    cancellation_date: new Date().toISOString()
  };

  // Create admin notification
  const adminTemplate: RecipientTemplate = {
    title: 'Order Cancelled',
    message: 'Order has been cancelled',
    description: (data: any) =>
      `Order ${data.order_id} has been cancelled by ${data.customer_name}. ` +
      `Order was placed on ${data.order_date} for ₹${data.total_amount.toFixed(2)}. ` +
      `Cancellation date: ${data.cancellation_date}.`
  };

  const adminSuccess = await createNotification({
    type: 'order_cancelled',
    title: adminTemplate.title,
    message: adminTemplate.message,
    description: adminTemplate.description(orderMetadata),
    for_admin: 1,
    for_dealer: 0,
    for_vendor: 0,
    metadata: orderMetadata
  });

  if (adminSuccess) {
    console.log('✅ Admin cancellation notification created successfully');
  } else {
    console.log('❌ Failed to create admin cancellation notification');
  }

  // Create customer notification
  const customerTemplate: RecipientTemplate = {
    title: 'Order Cancellation Confirmed',
    message: 'Your order has been cancelled',
    description: (data: any) =>
      `Your order ${data.order_id} has been successfully cancelled. ` +
      `Order was placed on ${data.order_date} for ₹${data.total_amount.toFixed(2)}. ` +
      `Cancellation date: ${data.cancellation_date}. ` +
      `If you have any questions, please contact our support team.`
  };

  const customerSuccess = await createNotification({
    type: 'order_cancelled',
    title: customerTemplate.title,
    message: customerTemplate.message,
    description: customerTemplate.description(orderMetadata),
    for_admin: 0,
    for_dealer: 0,
    for_vendor: 0,
    user_id: orderData.customer_id || null,
    metadata: orderMetadata
  });

  if (customerSuccess) {
    console.log('✅ Customer cancellation notification created successfully');
  } else {
    console.log('❌ Failed to create customer cancellation notification');
  }

  // Create dealer notification if dealer ID is provided
  if (dealerId) {
    console.log('🏪 Creating dealer cancellation notification for dealer:', dealerId);
    
    // First check if the dealer exists and get their details
    try {
      const dealerCheck = await query(
        'SELECT dealer_id, business_name, email FROM dealers WHERE dealer_id = ?',
        [dealerId]
      ) as any[];
      
      if (dealerCheck.length === 0) {
        console.log('⚠️ Dealer not found, skipping dealer notification');
      } else {
        const dealer = dealerCheck[0];
        console.log('📧 Dealer details found:', { name: dealer.business_name, email: dealer.email });
        
        // Create dealer notification
        const dealerTemplate: RecipientTemplate = {
          title: 'Order Cancelled by Customer',
          message: 'Customer cancelled their order',
          description: (data: any) =>
            `Order ${data.order_id} has been cancelled by ${data.customer_name}. ` +
            `Order was placed on ${data.order_date} for ₹${data.total_amount.toFixed(2)}. ` +
            `Cancellation date: ${data.cancellation_date}. ` +
            `Customer email: ${data.customer_email}.`
        };

        const dealerSuccess = await createNotification({
          type: 'order_cancelled',
          title: dealerTemplate.title,
          message: dealerTemplate.message,
          description: dealerTemplate.description(orderMetadata),
          for_admin: 0,
          for_dealer: 1,
          dealer_id: dealerId,
          metadata: orderMetadata
        });

        if (dealerSuccess) {
          console.log('✅ Dealer cancellation notification created successfully');
        } else {
          console.log('❌ Failed to create dealer cancellation notification');
        }

        // Send email to dealer
        if (dealer.email) {
          console.log('📧 Sending cancellation email to dealer:', dealer.email);
          try {
            const dealerEmailData = {
              order_id: orderId,
              dealer_name: dealer.business_name,
              dealer_email: dealer.email,
              customer_name: orderData.customer_name,
              customer_email: orderData.customer_email,
              customer_phone: orderData.customer_phone || 'Not provided',
              total_amount: orderData.total_amount,
              order_date: orderData.order_date,
              cancellation_date: new Date().toISOString(),
              items: orderData.items || [],
              order_status: 'Cancelled',
              payment_status: orderData.payment_status || 'Pending',
              shipping_address: orderData.shipping_address || 'Not provided',
              shipping_pincode: orderData.shipping_pincode || 'Not provided'
            };

            const emailSent = await sendDealerOrderNotificationEmail(dealerEmailData);
            if (emailSent) {
              console.log('✅ Dealer cancellation email sent successfully');
            } else {
              console.log('❌ Failed to send dealer cancellation email');
            }
          } catch (emailError) {
            console.error('❌ Error sending dealer cancellation email:', emailError);
          }
        } else {
          console.log('⚠️ Dealer email not available, skipping email');
        }
      }
    } catch (dealerError) {
      console.error('❌ Error looking up dealer for cancellation notification:', dealerError);
    }
  } else {
    console.log('ℹ️ No dealer ID provided, skipping dealer cancellation notification');
  }

  console.log('🏁 Order cancellation notification creation completed');
};
