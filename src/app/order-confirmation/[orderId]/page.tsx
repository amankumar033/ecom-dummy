"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingPage from '@/components/LoadingPage';
import { formatPrice } from '@/utils/priceUtils';

// Function to strip HTML tags from text
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
};

type OrderDetails = {
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

const OrderConfirmationPage = () => {
  const params = useParams();
  const { user, isLoggedIn } = useAuth();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderId = params.orderId as string;

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setError('Order ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/orders/${orderId}`);
        const data = await response.json();

        if (data.success) {
          setOrderDetails(data.order);
        } else {
          setError(data.message || 'Failed to fetch order details');
        }
      } catch (error) {
        console.error('Error fetching order details:', error);
        setError('Failed to fetch order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  if (loading) {
    return <LoadingPage message="Loading order details..." size="large" />;
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

  if (!orderDetails) {
    return (
      <div className="container mx-auto px-4 py-8 text-black">
        <div className="text-center py-12">
          <p className="text-xl mb-4">Order not found</p>
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-2 text-sm text-black mb-4">
          <Link href="/profile?tab=orders" className="hover:text-gray-700">Recent Orders</Link>
          <span>/</span>
          <Link href="/orders" className="hover:text-gray-700">View All</Link>
          <span>/</span>
          <span className="text-black">Order Confirmation</span>
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
              <h1 className="text-2xl font-bold text-green-800">Order Confirmed!</h1>
              <p className="text-green-700 mt-1">
                Thank you for your order. Your order has been successfully placed and is being processed.
              </p>
            </div>
          </div>
        </div>

        {/* Product Information */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-black mb-4">Product Information</h2>
          <div className="flex items-start space-x-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-black mb-2">{orderDetails.product_name}</h3>
              <p className="text-gray-600 mb-3">{stripHtmlTags(orderDetails.product_description)}</p>
              <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Quantity:</span>
                  <span className="ml-2 font-medium text-black">{orderDetails.quantity}</span>
                </div>
                <div>
                  <span className="text-gray-600">Price per item:</span>
                  <span className="ml-2 font-medium text-black">{formatPrice(orderDetails.product_price)}</span>
                </div>
              </div>
            </div>
            {orderDetails.product_image ? (
              <div className="flex-shrink-0">
                <img 
                  src={orderDetails.product_image} 
                  alt={orderDetails.product_name}
                  className="w-32 h-32 object-cover rounded-lg border"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-32 h-32 bg-gray-200 rounded-lg border flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Order Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Order Information */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-black mb-4">Order Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-medium text-black">#{orderDetails.order_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Order Date:</span>
                <span className="text-black">
                  {new Date(orderDetails.order_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Order Status:</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {orderDetails.order_status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Method:</span>
                <span className="text-black capitalize">
                  {orderDetails.payment_method === 'cod' ? 'Cash on Delivery' : orderDetails.payment_method}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  orderDetails.payment_status === 'Paid' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {orderDetails.payment_status}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-black mb-4">Customer Information</h2>
            <div className="space-y-3">
              <div>
                <span className="text-gray-600 text-sm">Name:</span>
                <p className="text-black font-medium">
                  {orderDetails.customer_name || user?.full_name || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Email:</span>
                <p className="text-black">{orderDetails.customer_email || 'N/A'}</p>
              </div>
              {orderDetails.customer_phone && (
                <div>
                  <span className="text-gray-600 text-sm">Phone:</span>
                  <p className="text-black">{orderDetails.customer_phone}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-black mb-4">Shipping Address</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-black font-medium">{orderDetails.shipping_address || 'Not provided'}</p>
            <p className="text-black">Postal Code: {orderDetails.shipping_pincode || 'Not provided'}</p>
            <p className="text-black">Phone: {orderDetails.customer_phone || 'Not provided'}</p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-black mb-4">Order Summary</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-black">{formatPrice((Number(orderDetails.total_amount) || 0) - (Number(orderDetails.tax_amount) || 0) - (Number(orderDetails.shipping_cost) || 0) + (Number(orderDetails.discount_amount) || 0))}</span>
              </div>
              {(Number(orderDetails.discount_amount) || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="text-green-600">-{formatPrice(orderDetails.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping:</span>
                <span className="text-black">{formatPrice(orderDetails.shipping_cost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax:</span>
                <span className="text-black">{formatPrice(orderDetails.tax_amount)}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-lg font-bold text-black">Total:</span>
                <span className="text-lg font-bold text-black">{formatPrice(orderDetails.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            href="/"
            className="flex-1 bg-amber-700 text-white py-3 px-6 rounded-lg hover:bg-black transition text-center font-medium"
          >
            Continue Shopping
          </Link>
          <Link 
            href="/profile?tab=orders"
            className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition text-center font-medium"
          >
            View My Orders
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage; 