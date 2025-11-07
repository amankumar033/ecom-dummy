"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { formatPrice, formatPriceNumber } from '@/utils/priceUtils';

// Function to strip HTML tags from text
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
};
import Link from 'next/link';
import ConfirmationModal from '@/components/ConfirmationModal';

type UserProfile = {
  user_id: string | number; // Support both string and number formats
  email: string;
  full_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  created_at?: string;
  updated_at?: string;
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



const ProfilePage = () => {
  const { user, isLoggedIn, logout } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [editLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  
  // Password change states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Recent orders
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Delete account states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Logout loading state
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Cancel order loading states
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);

  // Timeout for loading state
  useEffect(() => {
    if (loading && isLoggedIn) {
      const timeoutId = setTimeout(() => {
        console.log('⏰ Loading timeout reached, setting loading to false');
        setLoading(false);
        setError('Failed to load profile data. Please refresh the page.');
      }, 15000); // 15 second timeout

      return () => clearTimeout(timeoutId);
    }
  }, [loading, isLoggedIn]);

  // Debug logging
  useEffect(() => {
    console.log('ProfilePage component - Auth state:', { user, isLoggedIn });
    console.log('ProfilePage component - localStorage check:');
    console.log('  - Auth token:', localStorage.getItem('auth_token') ? 'Present' : 'Not present');
    console.log('  - User data:', localStorage.getItem('user_data') ? 'Present' : 'Not present');
    if (localStorage.getItem('user_data')) {
      try {
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        console.log('  - Parsed user data:', userData);
      } catch (error) {
        console.error('  - Error parsing user data:', error);
      }
    }
  }, [user, isLoggedIn]);

  // Handle URL hash for direct navigation to account settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash === '#account-settings') {
        setActiveTab('settings');
        // Scroll to the account settings section after a short delay
        setTimeout(() => {
          const element = document.getElementById('account-settings');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    }
  }, [activeTab]); // Added activeTab dependency to re-run when tab changes

  // Handle URL query parameter for tab navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam && ['profile', 'orders', 'settings'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []); // Only run once on component mount

  // Fetch user profile data
  const fetchUserProfile = async () => {
    console.log('🔄 fetchUserProfile called with user:', user);
    
    if (!user?.user_id) {
      console.log('❌ No user ID, skipping fetchUserProfile');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('📡 Making API call to /api/user/profile with user_id:', user.user_id);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('/api/user/profile', {
        headers: {
          'user-id': user.user_id.toString() // Convert to string for API call
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('📥 API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📥 API response data:', data);
      
      if (data.success) {
        console.log('✅ Profile data received successfully:', data.user);
        setProfile(data.user);
        setEditForm(data.user);
      } else {
        console.log('❌ Profile API returned error:', data.message);
        setError(data.message || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else {
          setError('Failed to fetch profile. Please check your connection.');
        }
      } else {
        setError('Failed to fetch profile');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch recent orders
  const fetchRecentOrders = async () => {
    if (!user?.user_id) return;

    try {
      setOrdersLoading(true);
      console.log('Fetching recent orders for user:', user.user_id);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`/api/orders/user/${user.user_id}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Recent orders response:', data);

      if (data.success) {
        // Get only the 2 most recent orders
        const recent = (data.orders || []).slice(0, 2);
        console.log('Setting recent orders:', recent);
        setRecentOrders(recent);
      } else {
        console.error('Failed to fetch orders:', data.message);
      }
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      // Don't show error for orders as it's not critical
    } finally {
      setOrdersLoading(false);
    }
  };



  // Debounced data fetching to prevent multiple simultaneous requests
  useEffect(() => {
    console.log('🔄 Profile useEffect triggered with:', { isLoggedIn, user, user_id: user?.user_id });
    
    if (isLoggedIn && user?.user_id) {
      console.log('✅ User is logged in and has user_id, fetching profile data...');
      // Fetch profile first (most important)
      fetchUserProfile();
      
      // Fetch orders with a slight delay to avoid overwhelming the database
      const timer1 = setTimeout(() => fetchRecentOrders(), 300);
      
      return () => {
        clearTimeout(timer1);
      };
    } else if (isLoggedIn && !user?.user_id) {
      console.log('⚠️ User is logged in but no user_id found, waiting for user data...');
      // User is logged in but user_id is not available yet, keep loading
      setLoading(true);
      

    } else if (!isLoggedIn) {
      console.log('❌ User is not logged in, setting loading to false');
      setLoading(false);
    }
  }, [user?.user_id, isLoggedIn]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!user?.user_id) return;

    try {
      setSaveLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout for save operation
      
      const response = await fetch('/api/user/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.user_id.toString() // Convert to string for API call
        },
        body: JSON.stringify(editForm),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setProfile(data.user);
        setIsEditing(false);
        showToast('success', 'Profile updated successfully!');
      } else {
        setError(data.message || 'Failed to update profile');
        showToast('error', 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('Request timed out. Please try again.');
          showToast('error', 'Request timed out. Please try again.');
        } else {
          setError('Failed to update profile. Please check your connection.');
          showToast('error', 'Failed to update profile. Please check your connection.');
        }
      } else {
        setError('Failed to update profile');
        showToast('error', 'Failed to update profile.');
      }
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle password form input changes
  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.user_id) return;

    // Client-side validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError('All password fields are required');
      showToast('error', 'All password fields are required.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      showToast('error', 'New passwords do not match.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      showToast('error', 'New password must be at least 6 characters long.');
      return;
    }

    try {
      setPasswordLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch('/api/user/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.user_id.toString(), // Convert to string for API call
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Clear the form
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        showToast('success', 'Password changed successfully!');
      } else {
        setError(data.message || 'Failed to change password');
        showToast('error', 'Failed to change password. Please try again.');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('Request timed out. Please try again.');
          showToast('error', 'Request timed out. Please try again.');
        } else {
          setError('Failed to change password. Please check your connection.');
          showToast('error', 'Failed to change password. Please check your connection.');
        }
      } else {
        setError('Failed to change password');
        showToast('error', 'Failed to change password.');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle delete account
  const handleDeleteAccount = async () => {
    if (!user?.user_id) return;

    try {
      setDeleteLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for delete operation
      
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.user_id.toString() // Convert to string for API call
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Logout and redirect
        setTimeout(() => {
          logout();
        }, 2000);
        showToast('success', 'Account deleted successfully!');
      } else {
        setError(data.message || 'Failed to delete account');
        showToast('error', 'Failed to delete account. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('Request timed out. Please try again.');
          showToast('error', 'Request timed out. Please try again.');
        } else {
          setError('Failed to delete account. Please check your connection.');
          showToast('error', 'Failed to delete account. Please check your connection.');
        }
      } else {
        setError('Failed to delete account');
        showToast('error', 'Failed to delete account.');
      }
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  // Handle logout with loading state
  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      showToast('info', 'Logging out...');
      await logout();
      showToast('success', 'Logged out successfully!');
    } catch (error) {
      console.error('Error during logout:', error);
      showToast('error', 'Error during logout. Please try again.');
    } finally {
      setLogoutLoading(false);
    }
  };

  // Handle cancel order
  const handleCancelOrder = async (orderId: string) => {
    try {
      setCancellingOrderId(orderId);
      showToast('info', 'Cancelling order...');
      
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
        setRecentOrders(prevOrders => 
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




  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get payment status color
  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'unpaid':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">Please log in to view your profile.</p>
            
            {/* Debug Information */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-yellow-800 mb-2">Debug Information:</h3>
              <div className="text-sm text-yellow-700 space-y-1">
                <p>Auth Context User: {user ? 'Present' : 'Not present'}</p>
                <p>Is Logged In: {isLoggedIn ? 'Yes' : 'No'}</p>
                <p>Auth Token: {typeof window !== 'undefined' && localStorage.getItem('auth_token') ? 'Present' : 'Not present'}</p>
                <p>User Data: {typeof window !== 'undefined' && localStorage.getItem('user_data') ? 'Present' : 'Not present'}</p>
                {typeof window !== 'undefined' && localStorage.getItem('user_data') && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">View User Data</summary>
                    <pre className="mt-2 text-xs bg-yellow-100 p-2 rounded overflow-auto">
                      {localStorage.getItem('user_data')}
                    </pre>
                  </details>
                )}
              </div>
            </div>
            
            <Link 
              href="/login"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!showCancelConfirm}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action cannot be undone and will notify the dealer."
        confirmText="Yes, Cancel Order"
        cancelText="Keep Order"
        onConfirm={() => handleCancelOrder(showCancelConfirm!)}
        onCancel={closeCancelConfirmation}
        type="danger"
        isLoading={!!cancellingOrderId}
      />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-8">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  My Profile
                </h1>
                <p className="text-gray-600 mt-1 text-xs sm:text-sm">Manage your account and preferences</p>
              </div>
            </div>
            
            {/* Desktop Back Button */}
            <Link 
              href="/"
              className="hidden sm:flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Home</span>
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden text-gray-600 hover:text-gray-800 transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden bg-white border-b border-gray-200 shadow-lg">
          <div className="px-4 py-4">
            <nav className="space-y-2">
              <button
                onClick={() => {
                  setActiveTab('profile');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === 'profile'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium">Profile Information</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('orders');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === 'orders'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium">Recent Orders</span>
                </div>
              </button>



              <button
                onClick={() => {
                  setActiveTab('settings');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === 'settings'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium">Account Settings</span>
                </div>
              </button>

              <div className="border-t border-gray-200 pt-2 mt-2">
                <Link 
                  href="/"
                  className="flex items-center px-4 py-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="font-medium">Back to Home</span>
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}

              <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Hidden on mobile */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              {/* User Avatar */}
              <div className="text-center mb-8">
                <div className="relative mx-auto mb-4">
                  <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                    <span className="text-3xl font-bold text-white">
                      {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {profile?.full_name || profile?.email || 'User'}
                </h3>
                <p className="text-sm text-gray-500 mb-2">{profile?.email}</p>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Active Account
                </div>
              </div>

              {/* Navigation Tabs */}
              <nav className="space-y-3">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full text-left px-4 py-4 rounded-xl transition-all duration-200 transform hover:scale-105 ${
                    activeTab === 'profile'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-50 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                      activeTab === 'profile' ? 'bg-white bg-opacity-20' : 'bg-blue-100'
                    }`}>
                      <svg className={`w-5 h-5 ${activeTab === 'profile' ? 'text-white' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold">Profile Information</div>
                      <div className={`text-xs font-medium ${activeTab === 'profile' ? 'text-blue-100' : 'text-gray-600'}`}>Personal details</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full text-left px-4 py-4 rounded-xl transition-all duration-200 transform hover:scale-105 ${
                    activeTab === 'orders'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-50 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                      activeTab === 'orders' ? 'bg-white bg-opacity-20' : 'bg-green-100'
                    }`}>
                      <svg className={`w-5 h-5 ${activeTab === 'orders' ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold">Recent Orders</div>
                      <div className={`text-xs font-medium ${activeTab === 'orders' ? 'text-blue-100' : 'text-gray-600'}`}>Order history</div>
                    </div>
                  </div>
                </button>



                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full text-left px-4 py-4 rounded-xl transition-all duration-200 transform hover:scale-105 ${
                    activeTab === 'settings'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-50 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                      activeTab === 'settings' ? 'bg-white bg-opacity-20' : 'bg-orange-100'
                    }`}>
                      <svg className={`w-5 h-5 ${activeTab === 'settings' ? 'text-white' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold">Account Settings</div>
                      <div className={`text-xs font-medium ${activeTab === 'settings' ? 'text-blue-100' : 'text-gray-600'}`}>Security & preferences</div>
                    </div>
                  </div>
                </button>
              </nav>

              {/* Danger Zone */}
              <div className="mt-6 pt-6 border-t border-red-200">
                <h4 className="text-sm font-medium text-red-700 mb-3 px-4">Danger Zone</h4>

              {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={logoutLoading}
                >
                  <div className="flex items-center">
                    {logoutLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-3"></div>
                        <span>Logging out...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                      </>
                    )}
                  </div>
                </button>

                {/* Delete Account Button */}
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Account
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 w-full">
            {/* Profile Information Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Profile Information</h2>
                      <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your personal information and contact details</p>
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center justify-center sm:justify-start space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                        disabled={editLoading}
                      >
                        {editLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                            <span className="text-sm sm:text-base">Loading...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="text-sm sm:text-base">Edit Profile</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 sm:p-8">
                  {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-red-600 font-medium">{error}</p>
                      </div>
                      <button
                        onClick={() => {
                          setError(null);
                          if (isLoggedIn && user?.user_id) {
                            fetchUserProfile();
                          }
                        }}
                        className="text-red-600 hover:text-red-800 font-medium text-sm underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {isEditing ? (
                    <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}>
                      {/* Basic Details Section */}
                      <div className="mb-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-blue-200">
                          Basic Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-bold text-gray-900 mb-3">
                            Full Name
                          </label>
                          <input
                            type="text"
                            name="full_name"
                            value={editForm.full_name || ''}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white text-gray-600 placeholder-gray-400"
                            placeholder="Enter your full name"
                          />
                          </div>
                        </div>
                        </div>

                      {/* Contact Information Section */}
                      <div className="mb-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-green-200">
                          Contact Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-bold text-gray-900 mb-3">
                            Email Address
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={editForm.email || ''}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white text-gray-900 placeholder-gray-600"
                            placeholder="Enter your email address"
                          />
                      </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-900 mb-3">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              name="phone"
                              value={editForm.phone || ''}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white text-gray-900 placeholder-gray-600"
                              placeholder="Enter your phone number"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Address Section */}
                      <div className="mb-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-purple-200">
                          Address Information
                        </h3>
                        <div className="space-y-6">
                          {/* Complete Address - Full Row */}
                          <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-900 mb-3">
                              Complete Address
                            </label>
                            <input
                              type="text"
                              name="address"
                              value={editForm.address || ''}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white text-gray-900 placeholder-gray-600"
                              placeholder="Enter your complete address"
                            />
                          </div>

                          {/* City - Full Row */}
                          <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-900 mb-3">
                              City
                            </label>
                            <input
                              type="text"
                              name="city"
                              value={editForm.city || ''}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white text-gray-900 placeholder-gray-600"
                              placeholder="Enter your city"
                            />
                          </div>

                          {/* Row: State and Pincode */}
                          <div className="grid grid-cols-2 gap-4 sm:gap-6">
                          <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-900 mb-3">
                              State
                            </label>
                            <input
                              type="text"
                              name="state"
                              value={editForm.state || ''}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white text-gray-900 placeholder-gray-600"
                              placeholder="Enter your state"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-900 mb-3">
                              Pincode
                            </label>
                            <input
                              type="text"
                              name="pincode"
                              value={editForm.pincode || ''}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white text-gray-900 placeholder-gray-600"
                              placeholder="Enter your pincode"
                            />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-4 mt-8">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(false);
                            setEditForm(profile || {});
                          }}
                          className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saveLoading}
                          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          {saveLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Saving...</span>
                            </div>
                          ) : (
                            'Save Changes'
                          )}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-8 ">
                      {/* Basic Details Section */}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-blue-200">
                          Basic Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">Full Name</label>
                            <p className="text-gray-900 font-medium">{profile?.full_name || 'Not provided'}</p>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">Email</label>
                            <p className="text-gray-900 font-medium">{profile?.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Contact Information Section */}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-green-200">
                          Contact Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">Phone</label>
                            <p className="text-gray-900 font-medium">{profile?.phone || 'Not provided'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Address Section */}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-purple-200">
                          Address Information
                        </h3>
                        <div className="space-y-6">
                          {/* Row 1: Complete Address and City */}
                          <div className="grid grid-cols-2 gap-4 sm:gap-6">
                            <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">Complete Address</label>
                            <p className="text-gray-900 font-medium">{profile?.address || 'Not provided'}</p>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">City</label>
                            <p className="text-gray-900 font-medium">{profile?.city || 'Not provided'}</p>
                            </div>
                          </div>

                          {/* Row 2: State and Pincode */}
                          <div className="grid grid-cols-2 gap-4 sm:gap-6">
                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">State</label>
                            <p className="text-gray-900 font-medium">{profile?.state || 'Not provided'}</p>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">Pincode</label>
                            <p className="text-gray-900 font-medium">{profile?.pincode || 'Not provided'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Account Information Section */}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-orange-200">
                          Account Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-800 mb-2">Member Since</label>
                            <p className="text-gray-900 font-medium">
                              {profile?.created_at ? formatDate(profile.created_at) : 'Unknown'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent Orders Tab */}
            {activeTab === 'orders' && (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
                    <Link 
                      href="/orders"
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View All Orders →
                    </Link>
                  </div>
                </div>

                <div className="p-3 sm:p-6">
            
                  {ordersLoading ? (
                  <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading orders...</p>
                    </div>
                  ) : recentOrders.length === 0 ? (
                    <div className="text-center py-12">
                    <div className="mb-4">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                      <p className="text-xl mb-4 text-black">You haven't placed any orders yet</p>
                      <Link 
                        href="/"
                        className="inline-block bg-amber-700 text-white px-6 py-3 rounded hover:bg-black transition"
                      >
                        Start Shopping
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {recentOrders.map((order) => (
                        <div key={order.order_id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                          {/* Header with Order Info and Status */}
                          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                              <div className="flex items-start space-x-4">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div>
                                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                                    Order #{order.order_id}
                                  </h3>
                                  <div className="flex items-center space-x-4 text-sm text-gray-600">
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
                              <div className="mt-4 lg:mt-0 flex flex-row gap-2 sm:gap-[45px]">
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
                          
                          <div className="p-3 sm:p-6">
                            {/* Order Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                                    <span className="text-lg font-bold text-gray-600">₹</span>
                                  </div>
                                                                     <div>
                                     <p className="text-xs text-gray-600 font-medium">Total Amount</p>
                                     <p className="text-lg font-bold text-gray-600">{formatPriceNumber(order.total_amount)}</p>
                                   </div>
                                </div>
                              </div>
                              
                              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                  </div>
                                                                     <div>
                                     <p className="text-xs text-gray-600 font-medium">Quantity</p>
                                     <p className="text-lg font-bold text-gray-600">{order.quantity}</p>
                                   </div>
                                </div>
                              </div>
                              
                              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                  </div>
                                                                     <div>
                                     <p className="text-xs text-gray-600 font-medium">Payment Method</p>
                                     <p className="text-lg font-bold text-gray-600 capitalize">
                                       {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}
                                     </p>
                                   </div>
                                </div>
                              </div>
                              
                              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 font-medium">Order Date</p>
                                    <p className="text-lg font-bold text-gray-900">{new Date(order.order_date).toLocaleDateString()}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Product and Order Details */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Product Information */}
                              <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                                <div className="flex items-center mb-4">
                                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                  </div>
                                  <h4 className="text-lg font-semibold text-gray-900">Product Information</h4>
                                </div>
                                <div className="flex items-center space-x-4 mb-4 ]">
                                  {order.product_image ? (
                                    <img 
                                      src={order.product_image} 
                                      alt={order.product_name}
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
                                  <div className="flex-1">
                                    <h5 className="font-semibold text-gray-900 text-lg mb-1">{order.product_name}</h5>
                                    <p className="text-sm text-gray-600 mb-2">{stripHtmlTags(order.product_description)}</p>
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                        Qty: {order.quantity}
                                      </span>
                                      <span className="font-semibold text-gray-900">
                                        {formatPrice(order.product_price)} each
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {(Number(order.discount_amount) || 0) > 0 && (
                                  <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                    <p className="text-sm font-medium text-gray-600 mb-1">Discount Applied</p>
                                    <p className="text-sm text-green-800">-{formatPrice(order.discount_amount)}</p>
                                  </div>
                                )}
                              </div>

                              {/* Shipping Information */}
                              <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                                <div className="flex items-center mb-4">
                                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                  </div>
                                  <h4 className="text-lg font-semibold text-gray-900">Shipping Information</h4>
                                </div>
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-sm text-gray-600">Address</span>
                                    <span className="text-gray-900 text-right max-w-xs">{order.shipping_address || 'Not provided'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-sm text-gray-600">Postal Code</span>
                                    <span className="font-medium text-gray-900">{order.shipping_pincode || 'Not provided'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-2">
                                    <span className="text-sm text-gray-600">Phone</span>
                                    <span className="font-medium text-gray-900">{order.customer_phone || 'Not provided'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-6 flex flex-col sm:flex-row gap-3">
                              <Link
                                href={`/order-confirmation/${order.order_id}`}
                                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-center font-medium flex items-center justify-center"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View Details
                              </Link>
                              {(order.order_status.toLowerCase() === 'pending' || order.order_status.toLowerCase() === 'processing') && (
                                <button 
                                  className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => openCancelConfirmation(order.order_id.toString())}
                                  disabled={cancellingOrderId === order.order_id.toString()}
                                >
                                  {cancellingOrderId === order.order_id.toString() ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      <span>Cancelling...</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                      Cancel Order
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="text-center pt-4">
                    <Link 
                      href="/orders"
                          className="inline-block bg-amber-700 text-white px-6 py-3 rounded hover:bg-black transition"
                    >
                          View All Orders
                    </Link>
                  </div>
                    </div>
                  )}
                </div>
              </div>
            )}



            {/* Account Settings Tab */}
            {activeTab === 'settings' && (
              <div id="account-settings" className="bg-white rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Account Settings</h2>
                </div>

                <div className="p-6">
                  <div className="space-y-6">
                    {/* Change Password Section */}
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-xl shadow-lg p-8 max-w-md mx-auto mt-8">
                      <h3 className="text-xl font-bold mb-6 text-black">Change Password</h3>
                      <form
                        onSubmit={handlePasswordChange}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block font-medium mb-1 text-black">Current Password</label>
                          <input
                            type="password"
                            name="currentPassword"
                            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-black bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm"
                            value={passwordForm.currentPassword}
                            onChange={handlePasswordInputChange}
                            required
                          />
                        </div>
                        <div>
                          <label className="block font-medium mb-1 text-black">New Password</label>
                          <input
                            type="password"
                            name="newPassword"
                            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-black bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm"
                            value={passwordForm.newPassword}
                            onChange={handlePasswordInputChange}
                            required
                            minLength={6}
                          />
                        </div>
                        <div>
                          <label className="block font-medium mb-1 text-black">Retype New Password</label>
                          <input
                            type="password"
                            name="confirmPassword"
                            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-black bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm"
                            value={passwordForm.confirmPassword}
                            onChange={handlePasswordInputChange}
                            required
                            minLength={6}
                          />
                        </div>
                        <button
                          type="submit"
                          className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                          disabled={passwordLoading}
                        >
                          {passwordLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Changing...</span>
                            </div>
                          ) : (
                            'Change Password'
                          )}
                        </button>
                      </form>
                    </div>

                    {/* Notification Settings */}
                    <div className="border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">Email Notifications</p>
                            <p className="text-sm text-gray-500">Receive updates about your orders</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">SMS Notifications</p>
                            <p className="text-sm text-gray-500">Receive text messages about your orders</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-red-900 mb-4">Delete Account</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data including orders.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </div>
                ) : (
                  'Delete Account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default ProfilePage; 