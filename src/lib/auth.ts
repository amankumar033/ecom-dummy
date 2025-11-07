export interface User {
  user_id: string; // Changed from number to string to support USR format
  email: string;
  full_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  created_at?: string;
  updated_at?: string;
  is_active?: number;
  last_login?: string;
  cart_items?: string;
}

export const AUTH_TOKEN_KEY = 'auth_token';
export const USER_DATA_KEY = 'user_data';

export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      console.log('🔑 Auth token stored successfully');
    } catch (error) {
      console.error('❌ Error storing auth token:', error);
    }
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      console.log('🔍 Retrieved auth token:', token ? 'Present' : 'Not present');
      return token;
    } catch (error) {
      console.error('❌ Error retrieving auth token:', error);
      return null;
    }
  }
  return null;
};

export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      console.log('🧹 Auth token removed successfully');
    } catch (error) {
      console.error('❌ Error removing auth token:', error);
    }
  }
};

export const setUserData = (user: User) => {
  if (typeof window !== 'undefined') {
    try {
      const userDataString = JSON.stringify(user);
      localStorage.setItem(USER_DATA_KEY, userDataString);
      console.log('💾 User data stored successfully:', user);
    } catch (error) {
      console.error('❌ Error storing user data:', error);
    }
  }
};

export const getUserData = (): User | null => {
  if (typeof window !== 'undefined') {
    try {
      const userData = localStorage.getItem(USER_DATA_KEY);
      if (userData) {
        const parsedUser = JSON.parse(userData);
        console.log('📋 Retrieved user data:', parsedUser);
        return parsedUser;
      } else {
        console.log('📋 No user data found in localStorage');
        return null;
      }
    } catch (error) {
      console.error('❌ Error retrieving user data:', error);
      // Clear corrupted data
      removeUserData();
      return null;
    }
  }
  return null;
};

export const removeUserData = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(USER_DATA_KEY);
      console.log('🧹 User data removed successfully');
    } catch (error) {
      console.error('❌ Error removing user data:', error);
    }
  }
};

export const logout = () => {
  console.log('🚪 Clearing all authentication data...');
  removeAuthToken();
  removeUserData();
  console.log('✅ All authentication data cleared');
};

export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  const hasToken = token !== null;
  console.log('🔍 Authentication check:', hasToken ? 'Authenticated' : 'Not authenticated');
  return hasToken;
}; 