"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import LoadingPage from '@/components/LoadingPage';

import { useToast } from '@/contexts/ToastContext';
import { formatPrice, formatPriceNumber } from '@/utils/priceUtils';

// Function to strip HTML tags from text
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
};

type Order = {
  order_id: number;
  user_id: number;
  product_id: string;
  product_name: string;
  product_price: number;
  product_image: string;
  product_description: string;
  quantity: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  shipping_pincode: string;
  order_date: string;
  order_status: string;
  total_amount: number;
  tax_amount: number;
  shipping_cost: number;
  discount_amount: number;
  payment_method: string;
  payment_status: string;
  transaction_id: string;
};

const OrdersPage = () => {
  const { user, isLoggedIn } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);

  // Add global event listener to prevent cursor movement when popup is open
  useEffect(() => {
    const preventCursorMovement = (e: MouseEvent) => {
      if (showCancelConfirm) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (showCancelConfirm) {
      document.addEventListener('mousemove', preventCursorMovement, { passive: false });
      document.addEventListener('mousedown', preventCursorMovement, { passive: false });
      document.addEventListener('mouseup', preventCursorMovement, { passive: false });
      document.body.style.overflow = 'hidden';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', preventCursorMovement);
      document.removeEventListener('mousedown', preventCursorMovement);
      document.removeEventListener('mouseup', preventCursorMovement);
      document.body.style.overflow = '';
      document.body.style.userSelect = '';
    };
  }, [showCancelConfirm]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.user_id) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/orders/user/${user.user_id}`);
        const data = await response.json();

        if (data.success) {
          setOrders(data.orders);
        } else {
          setError(data.message || 'Failed to fetch orders');
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        setError('Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user?.user_id]);

  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_status: 'Cancelled',
          updated_by: user?.user_id
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update the order status in the local state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.order_id.toString() === orderId 
              ? { ...order, order_status: 'Cancelled' }
              : order
          )
        );
        showToast('success', 'Order cancelled successfully!');
      } else {
        showToast('error', data.message || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      showToast('error', 'Failed to cancel order. Please try again.');
    } finally {
      setCancellingOrderId(null);
      setShowCancelConfirm(null);
    }
  };

  const openCancelConfirmation = (orderId: string) => {
    setShowCancelConfirm(orderId);
  };

  const closeCancelConfirmation = () => {
    setShowCancelConfirm(null);
  };

  // const getStatusColor = (status: string) => {
  //   switch (status.toLowerCase()) {
  //     case 'pending':
  //       return 'bg-yellow-100 text-yellow-800';
  //     case 'processing':
  //       return 'bg-blue-100 text-blue-800';
  //     case 'shipped':
  //       return 'bg-purple-100 text-purple-800';
  //     case 'delivered':
  //       return 'bg-green-100 text-green-800';
  //     case 'cancelled':
  //       return 'bg-red-100 text-red-800';
  //     default:
  //       return 'bg-gray-100 text-gray-800';
  //   }
  // };

  // const getPaymentStatusColor = (status: string) => {
  //   switch (status.toLowerCase()) {
  //     case 'paid':
  //       return 'bg-green-100 text-green-800';
  //     case 'pending':
  //       return 'bg-yellow-100 text-yellow-800';
  //     case 'failed':
  //       return 'bg-red-100 text-red-800';
  //     default:
  //       return 'bg-gray-100 text-gray-800';
  //   }
  // };

  if (loading) {
    return <LoadingPage message="Loading orders..." size="large" />;
  }

  if (!user || !isLoggedIn) {
    return (
      <div className="container mx-auto px-4 py-8 text-black">
        <div className="text-center py-12">
          <p className="text-xl mb-4">Please log in to view your orders</p>
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl sm:mx-auto sm:px-6 lg:px-8">
        <div className="flex items-center space-x-2 text-sm ml-2 sm:ml-0 text-black mb-6">
          <Link href="/profile" className="hover:text-gray-700">Profile</Link>
          <span>/</span>
          <Link href="/profile?tab=orders" className="hover:text-gray-700">Recent Orders</Link>
          <span>/</span>
          <span className="text-black">All Orders</span>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl ml-2 sm:ml-0 font-bold text-gray-800">All Orders</h1>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl mb-4 text-gray-600">No orders found</p>
            <Link 
              href="/"
              className="inline-block bg-amber-700 text-white px-6 py-3 rounded-lg hover:bg-black transition"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.order_id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                                {/* Order Header */}
                <div className="bg-white px-6 py-4 border-b border-gray-200">
                  <div className="space-y-3">
                    {/* First Row - Order Info */}
                    <div className="flex items-center space-x-3 mb-[20px]">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">Order #{order.order_id}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(order.order_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            {order.product_name}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Second Row - Status Information */}
                    <div className="flex flex-row gap-[45px] mt-4 sm:mt-0">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-600 mr-2">Status:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800`}>
                          {order.order_status}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-600 mr-2">Payment:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800`}>
                          {order.payment_status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {/* Order Summary - 2x2 Grid Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-lg">₹</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Total Amount</p>
                          <p className="font-bold text-gray-800">{formatPriceNumber(order.total_amount)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Quantity</p>
                          <p className="font-bold text-gray-800">{order.quantity}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Payment Method</p>
                          <p className="font-bold text-gray-800 text-sm">
                            {order.payment_method === 'cod' ? 'Cash On Delivery' : order.payment_method}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Order Date</p>
                          <p className="font-bold text-gray-800 text-sm">{new Date(order.order_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Product Information Section */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <h4 className="font-bold text-gray-800">Product Information</h4>
                    </div>
                    <div className="flex items-start space-x-7">
                      {order.product_image ? (
                        <div className="flex-shrink-0">
                          <img 
                            src={order.product_image} 
                            alt={order.product_name}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-20 h-20 bg-gray-200 rounded-lg border border-gray-200 flex items-center justify-center">
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1">
                        <h5 className="font-bold text-gray-800 text-lg mb-1">{order.product_name}</h5>
                        <p className="text-gray-600 text-sm mb-3">{stripHtmlTags(order.product_description)}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            Qty: {order.quantity}
                          </span>
                          <span className="font-bold text-gray-800">
                            {formatPrice(order.product_price)} each
                          </span>
                        </div>
                      </div>
                    </div>
                    {(Number(order.discount_amount) || 0) > 0 && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-800">Discount Applied</span>
                          <span className="text-green-600 font-bold">-{formatPrice(order.discount_amount)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Shipping Information */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <h4 className="font-bold text-gray-800">Shipping Information</h4>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Address:</span>
                          <span className="text-gray-800 font-medium">{order.shipping_address}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Postal Code:</span>
                          <span className="text-gray-800 font-medium">{order.shipping_pincode}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Phone:</span>
                          <span className="text-gray-800 font-medium">{order.customer_phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="font-bold text-gray-800 mb-4">Actions</h4>
                      <div className="space-y-3">
                        <Link
                          href={`/order-confirmation/${order.order_id}`}
                          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center font-medium flex items-center justify-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>View Details</span>
                        </Link>
                        {(order.order_status.toLowerCase() === 'pending' || order.order_status.toLowerCase() === 'processing') && (
                          <button 
                            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center space-x-2"
                            onClick={() => openCancelConfirmation(order.order_id.toString())}
                            disabled={cancellingOrderId === order.order_id.toString()}
                          >
                            {cancellingOrderId === order.order_id.toString() ? (
                              <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                <span>Processing...</span>
                              </div>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Cancel Order</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cancel Confirmation Popup */}
                  {(order.order_status.toLowerCase() === 'pending' || order.order_status.toLowerCase() === 'processing') && showCancelConfirm === order.order_id.toString() && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        <div className="p-6">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Cancel Order</h3>
                          </div>
                          <p className="text-gray-600 mb-6">
                            Are you sure you want to cancel this order? This action cannot be undone.
                          </p>
                          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                            <button
                              onClick={closeCancelConfirmation}
                              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                              Keep Order
                            </button>
                            <button
                              onClick={() => handleCancelOrder(order.order_id.toString())}
                              disabled={cancellingOrderId === order.order_id.toString()}
                              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                            >
                              {cancellingOrderId === order.order_id.toString() ? 'Processing...' : 'Cancel Order'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage; 