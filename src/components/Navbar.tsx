"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import EnhancedLink from './EnhancedLink';
import LoadingButton from './LoadingButton';
import CartDropdown from './CartDropdown';
import VoiceSearch from './VoiceSearch';


const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoggedIn, logout, login } = useAuth();
  const { cartItems, getTotalItems, loading: cartLoading } = useCart();
  const { showToast } = useToast();
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'account' | 'menu'>('account');
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isOrangeNavbarSticky, setIsOrangeNavbarSticky] = useState(false);
  const [showPromoBanner, setShowPromoBanner] = useState(true);
  const openLiveChat = () => {
    try {
      (window as any).openN8nChat?.();
    } catch (e) {
      console.error('Failed to open n8n chat:', e);
    }
  };

  const cartItemCount = getTotalItems();

  // Handle scroll for orange navbar sticky behavior
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      // Calculate when orange navbar should become sticky (after blue bar + black header)
      const stickyThreshold = 120; // Approximate height of blue bar + black header
      setIsOrangeNavbarSticky(scrollTop > stickyThreshold);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log(`Searching for: ${searchQuery.trim()}`);
      // Use smart navigation for search
      handleNavigation(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleVoiceSearch = (query: string) => {
    console.log(`Voice search for: ${query}`);
    setSearchQuery(query);
    // Use smart navigation for voice search
    handleNavigation(`/shop?search=${encodeURIComponent(query)}`);
    showToast('success', `Searching for: "${query}"`);
  };



  const toggleCart = () => {
    setIsCartOpen(prev => !prev);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = async () => {
    try {
      // Instant client-side logout
      await logout();

      // Toast and redirect with smart navigation
      showToast('success', 'Successfully logged out!');
      handleNavigation('/');
    } catch (error) {
      console.error('Logout error:', error);
      showToast('error', 'Logout failed. Please try again.');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Call the auth context login function to update the UI state
        if (data.user && data.token) {
          login(data.user, data.token);
        }
        
        showToast('success', 'Successfully logged in!');
        toggleMobileMenu();
        
        // Clear the form
        setLoginForm({ email: '', password: '' });
      } else {
        const errorData = await response.json();
        showToast('error', errorData.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      showToast('error', 'Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleNavigation = (href: string) => {
    console.log(`🚀 Starting navigation to: ${href}`);
    const startTime = performance.now();
    
    // Set a timeout to detect slow navigation
    const slowNavigationTimeout = setTimeout(() => {
      console.log(`🐌 Slow navigation detected for: ${href}`);
      document.dispatchEvent(new CustomEvent('navigationStart'));
    }, 300); // Show progress bar if navigation takes longer than 300ms
    
    // Direct router navigation for instant response
    router.push(href);
    
    const endTime = performance.now();
    const navigationTime = endTime - startTime;
    console.log(`⚡ Navigation initiated in ${navigationTime}ms`);
    
    // Clear timeout if navigation was fast
    if (navigationTime < 300) {
      clearTimeout(slowNavigationTimeout);
    } else {
      // If slow navigation was detected, set up completion detection
      const handleNavigationComplete = () => {
        console.log(`✅ Navigation completed for: ${href}`);
        document.dispatchEvent(new CustomEvent('navigationComplete'));
        // Clean up event listeners
        window.removeEventListener('load', handleNavigationComplete);
        window.removeEventListener('popstate', handleNavigationComplete);
      };
      
      // Listen for navigation completion
      window.addEventListener('load', handleNavigationComplete);
      window.addEventListener('popstate', handleNavigationComplete);
      
      // Fallback: hide progress bar after 3 seconds
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('navigationComplete'));
      }, 3000);
    }
  };

  return (
    <>
      {/* Combined Mobile Header - Single div with same background */}
      <div 
        className="block lg:hidden bg-white shadow-md border-b border-gray-200 mobile-header"
        data-testid="mobile-header"
        style={{
          display: 'flex',
          visibility: 'visible',
          opacity: 1,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          backgroundColor: 'white',
          width: '100%',
          flexDirection: 'column'
        }}
      >
        {/* Top Row - Logo, Cart, Menu */}
        <div className="flex items-center justify-between px-4 py-3">
            {/* Logo */}
            <Link 
              href="/"
              prefetch
              onClick={() => {
                console.log('Logo clicked - navigating to home');
                document.dispatchEvent(new CustomEvent('navigationStart'));
              }}
              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
            >
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-10 w-auto"
              onError={(e) => {
                console.log('Logo failed to load, using fallback');
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) {
                  fallback.style.display = 'flex';
                }
              }}
            />
            {/* Fallback Logo */}
            <div className="hidden items-center space-x-2" style={{ display: 'none' }}>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-900">Easy</span>
                <span className="text-sm font-semibold text-blue-600">Commerce</span>
                </div>
              </div>
          </Link>

          {/* Right Side - Login, Cart, and Menu */}
          <div className="flex items-center space-x-3">
            {/* Login/Profile Button - Mobile */}
            <LoadingButton
              onClick={isLoggedIn ? () => handleNavigation('/profile') : () => handleNavigation('/login')}
              className="text-gray-700 hover:text-blue-600 transition-colors flex flex-col items-center"
              showSpinner={false}
            >
              {isLoggedIn ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              <span className="text-xs mt-1">{isLoggedIn ? 'Profile' : 'Login'}</span>
            </LoadingButton>

            {/* Cart Icon - Mobile with shopping cart icon */}
            <div className="relative">
              <LoadingButton 
                onClick={toggleCart}
                className="relative cursor-pointer hover:text-blue-600 transition-colors flex items-center"
                showSpinner={false}
              >
                <div className="relative inline-block">
                  {/* Shopping Cart Icon */}
                <img src="/shopping-cart-black.png" alt="" className='w-7 h-7'/>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {cartItemCount}
                  </span>
                </div>
              </LoadingButton>
              {isCartOpen && (
                <CartDropdown onNavigate={handleNavigation} onClose={() => setIsCartOpen(false)} />
              )}
            </div>

            {/* Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom Row - Search Bar */}
        <div className="px-4 py-2 border-t border-gray-100">
          <form onSubmit={handleSearch} className="flex items-center">
            <input
              type="text"
              placeholder="What are you looking for?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 text-gray-900 rounded-l-lg outline-none bg-gray-50 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
            />
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 px-3 py-2.5 transition-colors text-white border-l border-blue-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <div className="ml-1">
              <VoiceSearch
                onSearch={handleVoiceSearch}
                className="h-full"
              />
            </div>
          </form>
        </div>
        {/* Mobile Menu - Side Drawer */}
        <div className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ease-in-out ${
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
            {/* Backdrop */}
            <div 
            className={`absolute inset-0 bg-black transition-opacity duration-300 ease-in-out ${
              isMobileMenuOpen ? 'bg-opacity-50' : 'bg-opacity-0'
            }`}
              onClick={toggleMobileMenu}
            />
            
            {/* Side Drawer */}
          <div className={`absolute left-0 top-0 h-full w-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
              {/* Header - Professional Design */}
              <div className="bg-gray-900 text-white p-4">
                <div className="flex items-center space-x-4 mb-4">
                  <button
                    onClick={toggleMobileMenu}
                    className="text-white hover:text-blue-300 transition-colors p-1 flex-shrink-0"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  {/* User Info Section */}
                  <div className="flex items-center space-x-3 flex-1">
                    {/* User Icon with Circle Border */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center border-2 border-white border-opacity-30">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                      </div>
                    </div>
                    
                    {/* User Details */}
                    <div className="flex-1 min-w-0">
                      {isLoggedIn ? (
                        <div>
                          <div className="font-medium text-sm truncate">Hello, {user?.full_name || 'User'}</div>
                          <div className="text-xs opacity-90">Welcome back!</div>
                        </div>
                      ) : (
                    <div>
                          <div className="font-medium text-sm">Hello Guest</div>
                          <div className="text-xs opacity-90">For better experience login</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Login/Logout Button */}
                  <div className="flex-shrink-0">
                    {isLoggedIn ? (
                      <LoadingButton
                        onClick={handleLogout}
                        className="bg-white text-[#16213e] px-3 py-2 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors"
                        showSpinner={false}
                      >
                        Logout
                      </LoadingButton>
                    ) : (
                  <LoadingButton
                    onClick={() => handleNavigation('/login')}
                        className="bg-white text-[#16213e] px-3 py-2 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors"
                    showSpinner={false}
                  >
                    Login
                  </LoadingButton>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex bg-gray-100">
                <button 
                  onClick={() => setActiveTab('account')}
                  className={`flex-1 py-3 px-4 font-medium transition-colors ${
                    activeTab === 'account' 
                      ? 'bg-white text-black border-b-2 border-[#00d4ff]' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Account
                </button>
                <button 
                  onClick={() => setActiveTab('menu')}
                  className={`flex-1 py-3 px-4 font-medium transition-colors ${
                    activeTab === 'menu' 
                      ? 'bg-white text-black border-b-2 border-[#00d4ff]' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Menu
                </button>
              </div>

              {/* Menu Items */}
              <div className="bg-white">
                {/* Account Tab Content - Shows Login Form or Account Options */}
                {activeTab === 'account' && (
                  <div className="pt-4 ">
                    {isLoggedIn ? (
                      // Logged in user - Show account options
                      <div className="flex flex-col space-y-4">
                        <div className="border-b border-gray-200 w-full">
                          <button
                            onClick={() => {
                              document.dispatchEvent(new CustomEvent('navigationStart'));
                              handleNavigation('/profile');
                              toggleMobileMenu();
                            }}
                            className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                          >
                            <div className="flex items-center justify-start w-full">
                              <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              <span>Profile Dashboard</span>
                            </div>
                          </button>
                        </div>

                        <div className="border-b border-gray-200 w-full">
                          <button
                            onClick={() => {
                              document.dispatchEvent(new CustomEvent('navigationStart'));
                              handleNavigation('/profile');
                              toggleMobileMenu();
                            }}
                            className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                          >
                            <div className="flex items-center justify-start w-full">
                              <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span>Profile Information</span>
                            </div>
                          </button>
                        </div>

                        <div className="border-b border-gray-200 w-full">
                          <button
                            onClick={() => {
                              document.dispatchEvent(new CustomEvent('navigationStart'));
                              handleNavigation('/profile#account-settings');
                              toggleMobileMenu();
                            }}
                            className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                          >
                            <div className="flex items-center justify-start w-full">
                              <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                              <span>Change Password</span>
                            </div>
                          </button>
                        </div>

                        <div className="border-b border-gray-200 w-full">
                  <LoadingButton
                            onClick={() => {
                              // Handle delete account - you can add confirmation modal here
                              if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                                // Add delete account logic here
                                console.log('Delete account clicked');
                              }
                              toggleMobileMenu();
                            }}
                            className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 transition-colors font-semibold [&>div]:justify-start"
                    showSpinner={false}
                  >
                            <div className="flex items-center justify-start w-full">
                              <svg className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Delete Account</span>
                            </div>
                  </LoadingButton>
                </div>
                      </div>
                    ) : (
                      // Not logged in - Show login form
                      <>
                        <form onSubmit={handleLoginSubmit} className="space-y-4 mt-[25px] px-6" >
                          {/* Email Field */}
                          <div>
                            <label htmlFor="mobile-email" className="block text-sm font-medium text-gray-700 mb-1">
                              Email Address
                            </label>
                            <input
                              type="email"
                              id="mobile-email"
                              value={loginForm.email}
                              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                              placeholder="Enter your email"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>

                          {/* Password Field */}
                          <div>
                            <label htmlFor="mobile-password" className="block text-sm font-medium text-gray-700 mb-1">
                              Password
                            </label>
                            <input
                              type="password"
                              id="mobile-password"
                              value={loginForm.password}
                              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                              placeholder="Enter your password"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>

                          {/* Login Button */}
                          <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                          >
                            {isLoggingIn ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                                Signing in...
                              </>
                            ) : (
                              'Sign In'
                            )}
                          </button>
                        </form>

                        {/* Sign Up Link */}
                        <div className="mt-4 text-center">
                          <p className="text-sm text-gray-600">
                            Don't have an account?{' '}
                  <LoadingButton
                              onClick={() => {
                                handleNavigation('/Signup');
                                toggleMobileMenu();
                              }}
                              className="text-[#00d4ff] font-medium hover:underline"
                    showSpinner={false}
                            >
                              Sign up here
                            </LoadingButton>
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Menu Tab Content - Shows Navigation Items */}
                {activeTab === 'menu' && (
                  <div className="flex flex-col space-y-4 mt-2">
                    <div className="border-b border-gray-200 w-full">
                  <button
                        onClick={() => {
                          document.dispatchEvent(new CustomEvent('navigationStart'));
                          handleNavigation('/');
                          toggleMobileMenu();
                        }}
                        className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                  >
                        <div className="flex items-center justify-start w-full">
                          <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          <span>Home</span>
                        </div>
                  </button>
                </div>



                    <div className="border-b border-gray-200 w-full">
                  <button
                        onClick={() => {
                          document.dispatchEvent(new CustomEvent('navigationStart'));
                          handleNavigation('/shop');
                          toggleMobileMenu();
                        }}
                        className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                  >
                        <div className="flex items-center justify-start w-full">
                          <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          <span>Shop</span>
                        </div>
                  </button>
                </div>



                    <div className="border-b border-gray-200 w-full">
                  <button
                        onClick={() => {
                          document.dispatchEvent(new CustomEvent('navigationStart'));
                          handleNavigation('/orders');
                          toggleMobileMenu();
                        }}
                        className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                  >
                        <div className="flex items-center justify-start w-full">
                          <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <span>Track Orders</span>
                        </div>
                  </button>
                </div>

                  

                    <div className="border-b border-gray-200 w-full">
                  <button
                        onClick={() => {
                          // Scroll to footer for Contact Us
                          document.dispatchEvent(new CustomEvent('navigationStart'));
                          toggleMobileMenu();
                          setTimeout(() => {
                            const footer = document.querySelector('footer') || document.querySelector('[data-footer]');
                            if (footer) {
                              footer.scrollIntoView({ behavior: 'smooth' });
                            }
                            // Complete navigation after scroll
                            setTimeout(() => {
                              document.dispatchEvent(new CustomEvent('navigationComplete'));
                            }, 500);
                          }, 300);
                        }}
                        className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                  >
                        <div className="flex items-center justify-start w-full">
                          <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>Contact Us</span>
                        </div>
                  </button>
                </div>
                  </div>
                )}
              </div>
            </div>
          </div>
                </div>

      <div className="font-sans" style={{ fontFamily: 'Inter, Arial, Helvetica, sans-serif' }}>
        {/* Top Information Bar - Gray Professional */}
        {showPromoBanner && (
          <div className="hidden lg:block bg-gradient-to-r from-gray-600 via-gray-700 to-gray-600 text-white py-1 px-10 border-b border-gray-500">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold text-sm text-white">End of Season Sale : Up to 35% Off</span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <span className="font-medium text-sm text-yellow-300">Use code "END35"</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-sm text-gray-300">Expires in</span>
                  <div className="flex space-x-1">
                    <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">10</div>
                    <span className="font-bold text-white text-xs">:</span>
                    <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">01</div>
                    <span className="font-bold text-white text-xs">:</span>
                    <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">28</div>
                    <span className="font-bold text-white text-xs">:</span>
                    <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">57</div>
                  </div>
                  <button
                    onClick={() => setShowPromoBanner(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1 ml-2 rounded-full hover:bg-gray-800"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Header - White Background */}
        <div className="hidden lg:block bg-white border-b border-gray-200 py-2 px-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
            {/* Logo */}
            <Link 
              href="/"
              prefetch
                        onClick={() => {
                console.log('Logo clicked - navigating to home');
                          document.dispatchEvent(new CustomEvent('navigationStart'));
              }}
              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-gray-900">Easy</span>
                  <span className="text-lg font-semibold text-blue-600">Commerce</span>
                </div>
              </div>
            </Link>

            {/* Search Bar - Desktop/Tablet only */}
            <div className="hidden md:block flex-1 max-w-2xl mx-4 lg:mx-8">
              <form onSubmit={handleSearch} className="flex items-center" suppressHydrationWarning>
                <input
                  type="text"
                  placeholder="What are you looking for?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 text-gray-900 rounded-l-lg outline-none bg-white border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  suppressHydrationWarning
                />
                  <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-3 transition-colors text-white font-medium border-l border-blue-500"
                  suppressHydrationWarning
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <div className="ml-2">
                  <VoiceSearch
                    onSearch={handleVoiceSearch}
                    className="h-full"
                  />
                </div>

              </form>
            </div>

            {/* User Icons - Desktop/Tablet */}
            <div className="hidden md:flex items-center space-x-6">
              {/* Auth Controls */}
              {isLoggedIn ? (
                <div className="flex items-center space-x-4">
                  <LoadingButton
                    onClick={() => handleNavigation('/profile')}
                    className="flex items-center space-x-2 cursor-pointer hover:text-blue-600 transition-colors text-gray-700"
                    showSpinner={false}
                    instantFeedback={false}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-medium">Profile</span>
                  </LoadingButton>
                  <LoadingButton
                    onClick={handleLogout}
                    className="flex items-center space-x-2 cursor-pointer hover:text-blue-600 transition-colors text-gray-700"
                    showSpinner={false}
                    instantFeedback={false}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                    </svg>
                    <span className="font-medium">Logout</span>
                  </LoadingButton>
                </div>
              ) : (
                <LoadingButton 
                        onClick={() => {
                    console.log('🔐 Login button clicked');
                    handleNavigation('/login');
                  }}
                  className="flex items-center space-x-2 cursor-pointer hover:text-blue-600 transition-colors text-gray-700"
                  showSpinner={false}
                  instantFeedback={false}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium">Login</span>
                </LoadingButton>
              )}

              {/* Cart with Dropdown */}
              <div className="relative">
                <LoadingButton 
                  onClick={toggleCart}
                  className="relative cursor-pointer hover:text-blue-600 transition-colors flex items-center text-gray-700"
                  showSpinner={false}
                >
                  <div className="relative inline-block">
                  <img src="/shopping-cart-black.png" alt="" className='w-7 h-7'/>
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {cartItemCount}
                    </span>
                  </div>
                  <span className="ml-2 font-medium">Cart</span>
                  <span className="ml-1 text-sm text-gray-500">({cartItemCount} items)</span>
                </LoadingButton>
                {isCartOpen && (
                  <CartDropdown onNavigate={handleNavigation} onClose={() => setIsCartOpen(false)} />
                )}
              </div>
            </div>

          </div>
        </div>
        </div>

        {/* Navigation Bar (sticky) - Hidden on mobile */}
        <div className="hidden lg:block">
          {/* Placeholder div to prevent content jump when navbar becomes fixed */}
          {isOrangeNavbarSticky && <div className="h-14"></div>}
          <div 
            className={`bg-gradient-to-r from-gray-600 via-gray-700 to-gray-600 border-b border-gray-500 text-white py-3 px-10 transition-all duration-300 ${
              isOrangeNavbarSticky ? 'fixed top-0 left-0 right-0 z-[999]' : ''
            }`}
          >
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
            {/* Left Side - Navigation Items with Dropdowns */}
            <div className="flex items-center">
              {/* Home */}
              <div className="relative group">
                <LoadingButton 
                  onClick={() => handleNavigation('/')}
                  className="block px-4 py-2 font-semibold text-white transition-colors duration-200 hover:text-blue-300 relative z-10"
                  showSpinner={false}
                  instantFeedback={false}
                >
                  Home
                </LoadingButton>
                <div className="absolute inset-0 bg-white rounded-lg transform scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300"></div>
              </div>

              {/* Shop */}
              <div className="relative group">
                <LoadingButton 
                  onClick={() => handleNavigation('/shop')}
                  className="block px-4 py-2 font-semibold text-white cursor-pointer transition-colors duration-200 hover:text-blue-300 relative z-10"
                  showSpinner={false}
                >
                  Shop
                </LoadingButton>
              </div>

              {/* Orders */}
              <div className="relative group">
                <LoadingButton 
                  onClick={() => handleNavigation('/orders')}
                  className="block px-4 py-2 font-semibold text-white cursor-pointer transition-colors duration-200 hover:text-blue-300 relative z-10"
                  showSpinner={false}
                >
                  Orders
                </LoadingButton>
                <div className="absolute inset-0 bg-white rounded-lg transform scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300"></div>
              </div>

              {/* Shop by Brands - Dropdown */}
              <div className="relative group">
                <button className="block px-4 py-2 font-semibold text-white cursor-pointer transition-colors duration-200 hover:text-blue-300 relative z-10 flex items-center">
                  Shop by Brands
                  <svg className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute inset-0 bg-white rounded-lg transform scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300"></div>
                
                {/* Dropdown Menu */}
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                  <div className="py-2">
                    <button onClick={() => handleNavigation('/shop?brand=toyota')} className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors">Toyota</button>
                    <button onClick={() => handleNavigation('/shop?brand=honda')} className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors">Honda</button>
                    <button onClick={() => handleNavigation('/shop?brand=bmw')} className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors">BMW</button>
                    <button onClick={() => handleNavigation('/shop?brand=mercedes')} className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors">Mercedes</button>
                    <button onClick={() => handleNavigation('/shop?brand=audi')} className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors">Audi</button>
                    <button onClick={() => handleNavigation('/shop?brand=ford')} className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors">Ford</button>
                    <button onClick={() => handleNavigation('/shop?brand=hyundai')} className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors">Hyundai</button>
                    <button onClick={() => handleNavigation('/shop')} className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors">View All Brands</button>
                  </div>
                </div>
              </div>

              {/* Shop by Category - Dropdown */}
              <div className="relative group">
                <button className="block px-4 py-2 font-semibold text-white cursor-pointer transition-colors duration-200 hover:text-blue-300 relative z-10 flex items-center">
                  Shop by Category
                  <svg className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute inset-0 bg-white rounded-lg transform scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300"></div>
                
                {/* Dropdown Menu */}
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                  <div className="py-2">
                    <button onClick={() => handleNavigation('/shop?category=brake-systems')} className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors">Brake Systems</button>
                    <button onClick={() => handleNavigation('/shop?category=tires-wheels')} className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors">Tires & Wheels</button>
                    <button onClick={() => handleNavigation('/shop?category=engine-parts')} className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors">Engine Parts</button>
                    <button onClick={() => handleNavigation('/shop?category=interior-accessories')} className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors">Interior Accessories</button>
                    <button onClick={() => handleNavigation('/shop?category=exterior-accessories')} className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors">Exterior Accessories</button>
                    <button onClick={() => handleNavigation('/shop?category=electronics')} className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors">Electronics</button>
                    <button onClick={() => handleNavigation('/shop?category=maintenance')} className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors">Maintenance</button>
                    <button onClick={() => handleNavigation('/shop')} className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors">View All Categories</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Professional Contact Section */}
            <div className="flex items-center space-x-6">
              {/* Phone Contact */}
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2.5 rounded-full shadow-md">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-white font-semibold text-sm">+91 97428 39555</div>
                  <div className="text-white text-xs">24/7 Support</div>
                </div>
              </div>

              {/* Live Chat */}
              <button type="button" onClick={openLiveChat} className="flex items-center space-x-3 cursor-pointer">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2.5 rounded-full shadow-md">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-white font-semibold text-sm">Live Chat</div>
                  <div className="text-white text-xs">Expert Support</div>
                </div>
              </button>
            </div>
          </div>
        </div>
        </div>

        {/* Combined Mobile Header - Single div with same background */}
        <div 
          className="block lg:hidden bg-white shadow-md border-b border-gray-200 mobile-header"
          data-testid="mobile-header"
          style={{
            display: 'flex',
            visibility: 'visible',
            opacity: 1,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
            backgroundColor: 'white',
            width: '100%',
            flexDirection: 'column'
          }}
        >
          {/* Top Row - Logo, Cart, Menu */}
          <div className="flex items-center justify-between px-4 py-3">
            {/* Logo */}
            <Link 
              href="/"
              prefetch
              onClick={() => {
                console.log('Logo clicked - navigating to home');
                          document.dispatchEvent(new CustomEvent('navigationStart'));
              }}
              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="h-10 w-auto"
                onError={(e) => {
                  console.log('Logo failed to load, using fallback');
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'flex';
                  }
                }}
              />
              {/* Fallback Logo */}
              <div className="hidden items-center space-x-2" style={{ display: 'none' }}>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-gray-900">Easy</span>
                  <span className="text-sm font-semibold text-blue-600">Commerce</span>
                </div>
              </div>
            </Link>

            {/* Right Side - Login, Cart, and Menu */}
            <div className="flex items-center space-x-3">
              {/* Login/Profile Button - Mobile */}
              <LoadingButton
                onClick={isLoggedIn ? () => handleNavigation('/profile') : () => handleNavigation('/login')}
                className="text-gray-700 hover:text-blue-600 transition-colors flex flex-col items-center"
                showSpinner={false}
              >
                {isLoggedIn ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
                <span className="text-xs mt-1">{isLoggedIn ? 'Profile' : 'Login'}</span>
              </LoadingButton>

              {/* Cart Icon - Mobile with shopping cart icon */}
              <div className="relative">
                <LoadingButton 
                  onClick={toggleCart}
                  className="relative cursor-pointer hover:text-blue-600 transition-colors flex items-center"
                  showSpinner={false}
                >
                  <div className="relative inline-block">
                    {/* Shopping Cart Icon */}
                    <img src="/shopping-cart-black.png" alt="" className='w-7 h-7'/>
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {cartItemCount}
                    </span>
                        </div>
                </LoadingButton>
                {isCartOpen && (
                  <CartDropdown onNavigate={handleNavigation} onClose={() => setIsCartOpen(false)} />
                )}
              </div>

              {/* Menu Button */}
              <button
                onClick={toggleMobileMenu}
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                  </button>
                </div>
                  </div>

          {/* Bottom Row - Search Bar */}
          <div className="px-4 py-2 border-t border-gray-100">
            <form onSubmit={handleSearch} className="flex items-center">
              <input
                type="text"
                placeholder="What are you looking for?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 text-gray-900 rounded-l-lg outline-none bg-gray-50 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
              />
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 px-3 py-2 transition-colors text-white border-l border-blue-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <div className="ml-1">
                <VoiceSearch
                  onSearch={handleVoiceSearch}
                  className="h-full"
                />
              </div>
            </form>
            </div>
          </div>

       
        </div>
      </div>
    </>
  );
};

export default Navbar;