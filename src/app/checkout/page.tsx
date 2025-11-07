
"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/utils/priceUtils';
import { useToast } from '@/contexts/ToastContext';

import { getValidImageSrc } from '@/utils/imageUtils';
import CheckoutProcessingPage from '@/components/CheckoutProcessingPage';

type CheckoutForm = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string; // Single address field as per orders table
  shipping_pincode: string; // Single pincode field as per orders table
  payment_method: string;
};

const CheckoutPage = () => {
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const { 
    cartItems, 
    loading: cartLoading, 
    clearCart,
    getTotalPrice,
    getDiscountedPrice,
    applyCoupon,
    removeCoupon,
    couponCode,
    discountPercentage
  } = useCart();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, _setError] = useState<string | null>(null);

  const [localCouponCode, setLocalCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState('');
  const [shippingCost] = useState(0);
  const [taxAmount] = useState(0);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  
  // Progress states for order processing
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const [formData, setFormData] = useState<CheckoutForm>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    shipping_address: '',
    shipping_pincode: '',
    payment_method: 'cod'
  });

  useEffect(() => {
    // Set loading to false when cart is loaded
    if (!cartLoading) {
      setLoading(false);
    }
    
    // Pre-fill form with user data if available
    if (isLoggedIn && user) {
      setFormData(prev => ({
        ...prev,
        customer_name: user.full_name || user.email?.split('@')[0] || 'Guest User',
        customer_email: user.email || '',
        customer_phone: user.phone || '',
        shipping_address: user.address || '',
        shipping_pincode: user.pincode || ''
      }));
    } else {
      // If not logged in, try to get data from localStorage as fallback
      try {
        const storedUserData = localStorage.getItem('user_data');
        if (storedUserData) {
          const userData = JSON.parse(storedUserData);
          setFormData(prev => ({
            ...prev,
            customer_name: userData.full_name || userData.email?.split('@')[0] || 'Guest User',
            customer_email: userData.email || '',
            customer_phone: userData.phone || '',
            shipping_address: userData.address || '',
            shipping_pincode: userData.pincode || ''
          }));
        }
      } catch (error) {
        console.log('No stored user data available');
      }
    }
  }, [cartLoading, isLoggedIn, user]);

  // Handle redirect after order success
  useEffect(() => {
    if (orderSuccess && orderData) {
      const redirectTimer = setTimeout(() => {
        // Check if we have multiple orders and redirect accordingly
        if (orderData.order_ids && orderData.order_ids.length > 1) {
          // Redirect to multi-order confirmation page
          const queryParams = new URLSearchParams({
            order_ids: orderData.order_ids.join(','),
            total_amount: orderData.total_amount.toString(),
            total_items: orderData.total_items.toString()
          });
          router.push(`/multi-order-confirmation?${queryParams.toString()}`);
        } else if (orderData.order_ids && orderData.order_ids.length === 1) {
          // Redirect to single order confirmation page
          router.push(`/order-confirmation/${orderData.order_ids[0]}`);
        } else {
          // Fallback to profile page
          router.push('/profile');
        }
      }, 3000); // Wait 3 seconds before redirecting

      return () => clearTimeout(redirectTimer);
    }
  }, [orderSuccess, orderData, router]);

  // Calculate totals
  const calculateSubtotal = () => {
    return getTotalPrice();
  };

  const calculateTotal = () => {
    const discountedSubtotal = getDiscountedPrice();
    return discountedSubtotal + shippingCost + taxAmount;
  };

  const handleApplyCoupon = () => {
    const result = applyCoupon(localCouponCode);
    setCouponMessage(result.message);
    if (result.success) {
      setLocalCouponCode('');
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate form
  const validateForm = () => {
    const requiredFields = [
      'customer_name',
      'customer_email',
      'customer_phone',
      'shipping_address',
      'shipping_pincode'
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof CheckoutForm]) {
        return false;
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.customer_email)) {
      return false;
    }

    // Phone validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.customer_phone)) {
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    if (cartItems.length === 0) {
      _setError('Your cart is empty');
      showToast('error', 'Your cart is empty');
      return;
    }

    setSubmitting(true);
    _setError(null);
    setShowProgress(true);
    setProgress(0);
    setProgressMessage('Starting order processing...');

    // Store cart items before clearing
    const currentCartItems = [...cartItems];

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          const newProgress = prev + Math.random() * 15;
          if (newProgress > 25 && prev <= 25) {
            setProgressMessage('Checking product availability...');
          } else if (newProgress > 50 && prev <= 50) {
            setProgressMessage('Processing payment...');
          } else if (newProgress > 75 && prev <= 75) {
            setProgressMessage('Creating order...');
          } else if (newProgress > 90 && prev <= 90) {
            setProgressMessage('Preparing confirmation...');
          }
          return Math.min(newProgress, 90);
        });
      }, 200);

      const orderData = {
        user_id: user?.user_id?.toString(),
        dealer_id: null,
        product_id: currentCartItems[0]?.product_id,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        shipping_address: formData.shipping_address,
        shipping_pincode: formData.shipping_pincode,
        order_date: new Date().toISOString(),
        order_status: 'Pending',
        total_amount: calculateTotal(),
        tax_amount: taxAmount,
        shipping_cost: shippingCost,
        discount_amount: getTotalPrice() - getDiscountedPrice(),
        payment_method: formData.payment_method,
        payment_status: 'Pending',
        transaction_id: null
      };
      
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItems: currentCartItems,
          orderData: orderData
        }),
      });

      // Clear progress interval and set to 100%
      clearInterval(progressInterval);
      setProgress(100);
      setProgressMessage('Order completed successfully!');

      const data = await response.json();

      if (data.success) {
        setOrderSuccess(true);
        setOrderData(data);
        showToast('success', 'Order placed successfully!');
        
        // Clear the cart after successful order
        try {
          await clearCart();
        } catch (clearError) {
          console.error('Error clearing cart after order:', clearError);
        }
        
        // Redirect immediately without waiting for notifications/emails
        setShowProgress(false);
        
        // Store order data for potential use
        if (data.order_ids && data.order_ids.length > 1) {
          // Store multi-order data in localStorage as backup
          const multiOrderData = {
            order_ids: data.order_ids,
            total_amount: data.total_amount,
            total_items: data.total_items,
            orders: data.orders,
            timestamp: Date.now()
          };
          localStorage.setItem('multiOrderData', JSON.stringify(multiOrderData));
        }
        
        // Let the useEffect handle the redirect after showing success message
        console.log('Order placed successfully, redirecting to profile in 3 seconds...');
      } else {
        setShowProgress(false);
        _setError(data.message || 'Failed to place order');
        showToast('error', data.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      setShowProgress(false);
      _setError('Failed to place order. Please try again.');
      showToast('error', 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Checkout</h2>
            <p className="text-gray-600">Please wait while we prepare your order...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isLoggedIn) {
    return (
      <div className="container mx-auto px-4 py-8 text-black">
        <div className="text-center py-12">
          <div className="mb-6">
            <svg className="w-16 h-16 text-amber-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-black mb-4">Login Required for Checkout</h2>
          <p className="text-lg text-gray-600 mb-6">
            You need to be logged in to complete your purchase. 
            {cartItems.length > 0 && (
              <span className="block mt-2">
                Don't worry! Your cart items will be saved and available after you log in.
              </span>
            )}
          </p>
          <div className="space-x-4">
            <Link 
              href="/login"
              className="inline-block bg-amber-700 text-white px-6 py-3 rounded hover:bg-black transition"
            >
              Login to Continue
            </Link>
            <Link 
              href="/"
              className="inline-block bg-gray-600 text-white px-6 py-3 rounded hover:bg-gray-700 transition"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Enhanced Order Processing UI (overlay) */}
      <CheckoutProcessingPage
        isVisible={showProgress}
        progress={progress}
        message={progressMessage}
      />
      
      {orderSuccess ? (
        <div className="container mx-auto px-4 py-8 text-black">
          <div className="text-center py-12">
            <div className="mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">
              {orderData?.order_ids?.length > 1 ? 'Orders Confirmed!' : 'Order Confirmed!'}
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Thank you for your {orderData?.order_ids?.length > 1 ? 'orders' : 'order'}. We'll send you a confirmation email shortly.
            </p>
            <div className="animate-pulse">
              <p className="text-sm text-gray-500">
                Redirecting to {orderData?.order_ids?.length > 1 ? 'order confirmation' : 'order details'}...
              </p>
            </div>
            <div className="mt-4 space-x-4">
              {orderData?.order_ids?.length > 1 ? (
                <Link 
                  href={`/multi-order-confirmation?order_ids=${orderData.order_ids.join(',')}&total_amount=${orderData.total_amount}&total_items=${orderData.total_items}`}
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition"
                >
                  View Order Confirmation Now
                </Link>
              ) : orderData?.order_ids?.length === 1 ? (
                <Link 
                  href={`/order-confirmation/${orderData.order_ids[0]}`}
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition"
                >
                  View Order Details Now
                </Link>
              ) : (
                <Link 
                  href="/profile"
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition"
                >
                  View Orders Now
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : cartItems.length === 0 ? (
        <div className="container mx-auto px-4 py-8 text-black">
          <div className="text-center py-12">
            <p className="text-xl mb-4">Your cart is empty</p>
            <Link 
              href="/"
              className="inline-block bg-amber-700 text-white px-6 py-3 rounded hover:bg-black transition"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">


            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
              <Link href="/" className="hover:text-gray-900">Home</Link>
              <span>/</span>
              <Link href="/cart" className="hover:text-gray-900">Cart</Link>
              <span>/</span>
              <span className="text-gray-900">Checkout</span>
            </div>

            <h1 className="text-3xl font-bold mb-8 text-black">Checkout</h1>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">


          {/* Checkout Form */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold mb-6 text-black">Customer Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="customer_name" className="block text-sm font-medium mb-2 text-black">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="customer_name"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="customer_email" className="block text-sm font-medium mb-2 text-black">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="customer_email"
                    name="customer_email"
                    value={formData.customer_email}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="customer_phone" className="block text-sm font-medium mb-2 text-black">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="customer_phone"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    placeholder="10-digit number"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold mb-6 text-black">Shipping Address</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="shipping_address" className="block text-sm font-medium mb-2 text-black">
                    Shipping Address *
                  </label>
                  <textarea
                    id="shipping_address"
                    name="shipping_address"
                    value={formData.shipping_address}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    rows={3}
                    placeholder="Enter your complete shipping address"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="shipping_pincode" className="block text-sm font-medium mb-2 text-black">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    id="shipping_pincode"
                    name="shipping_pincode"
                    value={formData.shipping_pincode}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    placeholder="Enter 6-digit pincode"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-6 text-black">Payment Method</h2>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="payment_method"
                    value="cod"
                    checked={formData.payment_method === 'cod'}
                    onChange={handleInputChange}
                    className="mr-3"
                  />
                  <span className="text-black">Cash on Delivery (COD)</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="payment_method"
                    value="card"
                    checked={formData.payment_method === 'card'}
                    onChange={handleInputChange}
                    className="mr-3"
                  />
                  <span className="text-black">Credit/Debit Card</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="payment_method"
                    value="upi"
                    checked={formData.payment_method === 'upi'}
                    onChange={handleInputChange}
                    className="mr-3"
                  />
                  <span className="text-black">UPI</span>
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-6 text-black">Order Summary</h2>
              
              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {cartItems.map(item => (
                  <div key={item.product_id} className="flex items-center space-x-3">
                    <img 
                      src={getValidImageSrc(item.image)} 
                      alt={item.name} 
                      className="w-12 h-12 object-cover rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/engine1.png';
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-black">{item.name}</h3>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-sm font-medium text-black">
                      {formatPrice((Number(item.price) || 0) * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Section */}
              <div className="border-t pt-4 mb-4">
                <h3 className="text-sm font-medium text-black mb-2">Have a coupon?</h3>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={localCouponCode}
                    onChange={(e) => setLocalCouponCode(e.target.value)}
                    placeholder="Enter coupon code"
                    className="flex-1 border border-gray-300 text-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition"
                  >
                    Apply
                  </button>
                </div>
                {couponMessage && (
                  <p className={`text-xs mt-1 ${couponMessage.includes('applied') ? 'text-green-600' : 'text-red-600'}`}>
                    {couponMessage}
                  </p>
                )}
                {couponCode && (
                  <div className="flex items-center justify-between mt-2 p-2 bg-green-50 rounded">
                    <span className="text-sm text-green-700">Coupon: {couponCode}</span>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-red-600 text-sm hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Order Totals */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between text-black">
                  <span>Subtotal:</span>
                  <span>{formatPrice(calculateSubtotal())}</span>
                </div>
                
                {discountPercentage > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({discountPercentage}%):</span>
                    <span>-{formatPrice(calculateSubtotal() - getDiscountedPrice())}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-black">
                  <span>Shipping:</span>
                  <span>{formatPrice(shippingCost)}</span>
                </div>
                
                <div className="flex justify-between text-black">
                  <span>Tax:</span>
                  <span>{formatPrice(taxAmount)}</span>
                </div>
                
                <div className="flex justify-between font-bold text-lg border-t pt-3 text-black">
                  <span>Total:</span>
                  <span>{formatPrice(calculateTotal())}</span>
                </div>
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="flex items-center justify-center">Processing...</div>
                ) : (
                  `Place Order - ${formatPrice(calculateTotal())}`
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
      )}
    </>
  );
};

export default CheckoutPage; 