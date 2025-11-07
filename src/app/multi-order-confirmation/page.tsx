"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingPage from '@/components/LoadingPage';
import { formatPrice } from '@/utils/priceUtils';

type OrderItem = {
  order_id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  dealer_name: string;
};

type MultiOrderData = {
  orders: OrderItem[];
  total_items: number;
  total_amount: number;
  order_ids: string[];
  parent_order_id: string;
};

const MultiOrderConfirmationPage = () => {
  // const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn } = useAuth();
  const [orderData, setOrderData] = useState<MultiOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        setLoading(true);
        
        // Get order data from URL parameters or localStorage
        let orderIdsParam = searchParams.get('order_ids');
        let totalAmountParam = searchParams.get('total_amount');
        let totalItemsParam = searchParams.get('total_items');
        
        // If URL parameters are missing, try to get from localStorage
        if (!orderIdsParam) {
          const storedData = localStorage.getItem('multiOrderData');
          if (storedData) {
            try {
              const parsedData = JSON.parse(storedData);
              // Check if data is not too old (within 1 hour)
              if (Date.now() - parsedData.timestamp < 3600000) {
                orderIdsParam = parsedData.order_ids.join(',');
                totalAmountParam = parsedData.total_amount.toString();
                totalItemsParam = parsedData.total_items.toString();
              } else {
                // Clear old data
                localStorage.removeItem('multiOrderData');
              }
            } catch (error) {
              console.error('Error parsing stored multi-order data:', error);
              localStorage.removeItem('multiOrderData');
            }
          }
        }
        
        if (!orderIdsParam) {
          setError('No order information found');
          setLoading(false);
          return;
        }

        const orderIds = orderIdsParam.split(',');
        const totalAmount = parseFloat(totalAmountParam || '0');
        const totalItems = parseInt(totalItemsParam || '0');

        // Fetch individual order details for each order ID
        const orderPromises = orderIds.map(async (orderId) => {
          try {
            const response = await fetch(`/api/orders/${orderId}`);
            const data = await response.json();
            
            if (data.success) {
              return {
                order_id: orderId,
                product_id: data.order.product_id,
                name: data.order.product_name,
                price: data.order.product_price,
                quantity: data.order.quantity,
                image: data.order.product_image,
                dealer_name: data.order.dealer_name || 'Unknown Dealer'
              };
            } else {
              console.error(`Failed to fetch order ${orderId}:`, data.message);
              return null;
            }
          } catch (error) {
            console.error(`Error fetching order ${orderId}:`, error);
            return null;
          }
        });

        const orderResults = await Promise.all(orderPromises);
        const validOrders = orderResults.filter(order => order !== null) as OrderItem[];

        if (validOrders.length === 0) {
          setError('No valid orders found');
          setLoading(false);
          return;
        }

        setOrderData({
          orders: validOrders,
          total_items: totalItems,
          total_amount: totalAmount,
          order_ids: orderIds,
          parent_order_id: `PORD${orderIds[0].replace(/\D/g, '')}`
        });

        // Clear the stored data after successful load
        localStorage.removeItem('multiOrderData');

      } catch (error) {
        console.error('Error fetching order data:', error);
        setError('Failed to fetch order information');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [searchParams]);

  if (loading) {
    return <LoadingPage message="Loading order confirmation..." size="large" />;
  }

  if (!user || !isLoggedIn) {
    return (
      <div className="container mx-auto px-4 py-8 text-black">
        <div className="text-center py-12">
          <p className="text-xl mb-4">Please log in to view order details</p>
          <Link 
            href="/login"
            className="inline-block bg-amber-700 text-white px-6 py-3 rounded hover:bg-black transition"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-black">
        <div className="text-center py-12">
          <p className="text-xl mb-4 text-red-600">{error}</p>
          <Link 
            href="/"
            className="inline-block bg-amber-700 text-white px-6 py-3 rounded hover:bg-black transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="container mx-auto px-4 py-8 text-black">
        <div className="text-center py-12">
          <p className="text-xl mb-4">Order information not found</p>
          <Link 
            href="/"
            className="inline-block bg-amber-700 text-white px-6 py-3 rounded hover:bg-black transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-2 text-sm text-black mb-4">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          <span>/</span>
          <span className="text-black">Multi-Order Confirmation</span>
        </div>

        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h1 className="text-2xl font-bold text-green-800">Multiple Orders Confirmed!</h1>
              <p className="text-green-700 mt-1">
                Thank you for your orders. All {orderData.orders.length} orders have been successfully placed and are being processed.
              </p>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-black mb-4">Order Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{orderData.orders.length}</div>
              <div className="text-sm text-blue-700">Total Orders</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{orderData.total_items}</div>
              <div className="text-sm text-green-700">Total Items</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{formatPrice(orderData.total_amount)}</div>
              <div className="text-sm text-purple-700">Total Amount</div>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Parent Order ID: <span className="font-mono">{orderData.parent_order_id}</span>
          </div>
        </div>

        {/* Individual Orders */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-black mb-4">Your Orders</h2>
          <div className="space-y-4">
                                    {orderData.orders.map((order) => (
              <div key={order.order_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {order.image ? (
                        <img 
                          src={order.image} 
                          alt={order.name}
                          className="w-16 h-16 object-cover rounded-lg border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg border flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-black truncate">{order.name}</h3>
                      <p className="text-sm text-gray-600">Order #{order.order_id}</p>
                      <p className="text-sm text-gray-600">Dealer: {order.dealer_name}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-1">
                        <span className="text-sm text-gray-600">Qty: {order.quantity}</span>
                        <span className="text-sm text-gray-600">Price: {formatPrice(order.price)}</span>
                        <span className="text-sm font-medium text-black">Total: {formatPrice(order.price * order.quantity)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-full lg:w-auto">
                    <Link
                      href={`/order-confirmation/${order.order_id}`}
                      className="w-full lg:w-auto inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span className="hidden sm:inline">View Confirmation for Order {order.order_id}</span>
                      <span className="sm:hidden">View Order</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Information removed as per requirements */}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            href="/"
            className="flex-1 bg-amber-700 text-white py-3 px-6 rounded-lg hover:bg-black transition text-center font-medium"
          >
            Continue Shopping
          </Link>
          <Link 
            href="/profile#recent-orders"
            className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition text-center font-medium"
          >
            View My Orders
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MultiOrderConfirmationPage;
