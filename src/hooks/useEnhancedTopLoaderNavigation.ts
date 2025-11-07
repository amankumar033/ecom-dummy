'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';

export const useEnhancedTopLoaderNavigation = () => {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  // Listen for navigation events
  useEffect(() => {
    const handleRouteChangeStart = () => {
      setIsNavigating(true);
    };

    const handleRouteChangeComplete = () => {
      setIsNavigating(false);
    };

    const handleRouteChangeError = () => {
      setIsNavigating(false);
    };

    // Add event listeners for navigation events
    window.addEventListener('beforeunload', handleRouteChangeStart);
    window.addEventListener('load', handleRouteChangeComplete);
    window.addEventListener('error', handleRouteChangeError);

    return () => {
      window.removeEventListener('beforeunload', handleRouteChangeStart);
      window.removeEventListener('load', handleRouteChangeComplete);
      window.removeEventListener('error', handleRouteChangeError);
    };
  }, []);

  const navigateTo = useCallback(async (href: string, options?: { 
    replace?: boolean; 
    scroll?: boolean;
    shallow?: boolean;
  }) => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    
    try {
      if (options?.replace) {
        router.replace(href, options);
      } else {
        router.push(href, options);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
    }
  }, [router, isNavigating]);

  const navigateWithOptimization = useCallback(async (href: string, options?: {
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
  }) => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    
    try {
      // Use replace for better performance when appropriate
      const shouldReplace = options?.replace || href === window.location.pathname;
      
      if (shouldReplace) {
        router.replace(href, options);
      } else {
        router.push(href, options);
      }
      
      // Fallback completion after 500ms
      setTimeout(() => {
        if (isNavigating) {
          setIsNavigating(false);
        }
      }, 500);
      
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
    }
  }, [router, isNavigating]);

  return {
    navigateTo,
    navigateWithOptimization,
    isNavigating
  };
};

