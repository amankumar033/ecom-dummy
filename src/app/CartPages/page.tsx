"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/utils/priceUtils';
import LoadingPage from '@/components/LoadingPage';
import { getValidImageSrc, handleImageError } from '@/utils/imageUtils';



const CartPages = () => {
  const { user, isLoggedIn } = useAuth();
  const { cartItems, updateQuantity, removeFromCart, clearCart, loading: cartLoading } = useCart();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState('');
  const [updatingQuantities] = useState<{ [key: string]: boolean }>({});

  // Debug logging
  useEffect(() => {
    console.log('CartPages component - Auth state:', { user, isLoggedIn });
  }, [user, isLoggedIn]);

  // Update loading state when cart loading changes
  useEffect(() => {
    if (!cartLoading) {
      setLoading(false);
    }
  }, [cartLoading]);



  const applyCoupon = () => {
    // Simple coupon logic - you can expand this
    if (couponCode.toLowerCase() === 'discount10') {
      setDiscount(10);
      setCouponMessage('Coupon applied! 10% discount');
      showToast('success', 'Coupon applied successfully!');
    } else {
      setCouponMessage('Invalid coupon code');
      showToast('error', 'Invalid coupon code');
    }
  };

  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + (Number(item.price) * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal - (subtotal * discount / 100);
  };

  if (loading) {
    return <LoadingPage message="Loading your cart..." size="large" />;
  }

  if (!user || !isLoggedIn) {
    return (
      <div className="container mx-auto px-4 py-8 text-black">
        <div className="text-center py-12">
          <p className="text-xl mb-4">Please log in to view your cart</p>
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">


      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-2 sm:right-4 z-40 p-3 sm:p-4 rounded-lg shadow-lg max-w-xs sm:max-w-sm ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 
          toast.type === 'error' ? 'bg-red-500 text-white' : 
          'bg-orange-500 text-white'
        }`}>
          <div className="text-xs sm:text-sm">{toast.message}</div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center space-x-2 text-sm text-black mb-4">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          <span>/</span>
          <span className="text-black">Cart</span>
        </div>

        <h1 className="text-3xl font-bold mb-8 text-black">Shopping Cart</h1>
        

        
        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl mb-4 text-black">Your cart is empty</p>
            <Link 
              href="/"
              className="inline-block bg-amber-700 text-white px-6 py-3 rounded hover:bg-black transition"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-2/3">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="hidden md:grid grid-cols-12 bg-gray-100 p-2 sm:p-4 text-black font-bold text-sm uppercase">
                  <div className="col-span-5 text-black">Product</div>
                  <div className="col-span-2 text-center text-black">Price</div>
                  <div className="col-span-3 text-center text-black">Quantity</div>
                  <div className="col-span-2 text-center text-black">Total</div>
                </div>
                
                {cartItems.map(item => {
                  // Debug: Log image paths
                  console.log('Cart item image debug:', {
                    productId: item.product_id,
                    productImage: item.product?.image_1,
                    itemImage: item.image,
                    finalImage: getValidImageSrc(item.product?.image_1 || item.image)
                  });
                  
                  return (
                    <div key={item.product_id} className="grid grid-cols-12 p-2 sm:p-4 border-b border-gray-200 items-center">
                      <div className="col-span-5 flex items-center">
                        <div className="relative w-16 h-16 mr-2 sm:mr-4">
                          <Image 
                            src={getValidImageSrc(item.image || item.product?.image_1 || '/engine1.png')} 
                            alt={item.name} 
                            fill
                            className="object-cover rounded"
                            onError={handleImageError}
                            unoptimized={!!(item.image && item.image.startsWith('https://'))}
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-black">{item.name}</h3>
                          <button 
                            className="text-red-500 text-sm mt-1"
                            onClick={() => removeFromCart(item.product_id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                                              <div className="col-span-2 text-center text-black">{formatPrice(item.price)}</div>
                      <div className="col-span-3 flex justify-center">
                        <div className="flex items-center border border-gray-200 rounded">
                          <button 
                            className="px-2 sm:px-3 py-1 text-black hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            disabled={updatingQuantities[item.product_id]}
                          >
                            {updatingQuantities[item.product_id] ? (
                              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-gray-600"></div>
                            ) : (
                              '-'
                            )}
                          </button>
                          <span className="px-2 sm:px-3 text-black text-sm sm:text-base min-w-[2rem] sm:min-w-[3rem] text-center">{item.quantity}</span>
                          <button 
                            className="px-2 sm:px-3 py-1 text-black hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            disabled={updatingQuantities[item.product_id] || item.quantity >= (item.stock_quantity || 999)}
                          >
                            {updatingQuantities[item.product_id] ? (
                              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-gray-600"></div>
                            ) : (
                              '+'
                            )}
                          </button>
                        </div>
                        {item.stock_quantity !== undefined && (
                          <span className="hidden sm:inline text-xs text-black ml-2">
                            {Math.max(0, item.stock_quantity)} left
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 text-center font-bold text-black">
                        {formatPrice((Number(item.price) || 0) * item.quantity)}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 flex justify-between">
                <Link 
                  href="/"
                  className="text-amber-700 hover:text-black transition"
                >
                  ← Continue Shopping
                </Link>
                <button 
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition text-black"
                  onClick={clearCart}
                >
                  Clear Cart
                </button>
              </div>
            </div>
            
            <div className="md:w-1/3">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4 text-black">Order Summary</h2>
                
                {/* Coupon Code Section */}
                <div className="mb-6">
                  <label htmlFor="coupon" className="block text-sm font-medium mb-2 text-black">
                    Coupon Code
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      id="coupon"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                      placeholder="Enter coupon code"
                    />
                    <button
                      onClick={applyCoupon}
                      className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700 transition"
                    >
                      Apply
                    </button>
                  </div>
                  {couponMessage && (
                    <p className={`text-sm mt-2 ${couponMessage.includes('applied') ? 'text-green-600' : 'text-red-600'}`}>
                      {couponMessage}
                    </p>
                  )}
                </div>

                {/* Order Summary */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex justify-between text-black">
                    <span>Subtotal:</span>
                    <span>{formatPrice(calculateSubtotal())}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({discount}%):</span>
                      <span>-{formatPrice(calculateSubtotal() * discount / 100)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-3 text-black">
                    <span>Total:</span>
                    <span>{formatPrice(calculateTotal())}</span>
                  </div>
                </div>

                {isLoggedIn ? (
                  <Link 
                    href="/checkout"
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition mt-6 inline-block text-center"
                  >
                    Proceed to Checkout
                  </Link>
                ) : (
                  <div className="mt-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-amber-800 text-sm font-medium">
                          Login required to checkout
                        </span>
                      </div>
                      <p className="text-amber-700 text-xs mt-1">
                        Your cart items will be saved when you log in.
                      </p>
                    </div>
                    <Link 
                      href="/login"
                      className="w-full bg-amber-600 text-white py-3 px-6 rounded-lg hover:bg-amber-700 transition inline-block text-center"
                    >
                      Login to Checkout
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPages;