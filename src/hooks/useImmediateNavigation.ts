'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';

export const useImmediateNavigation = () => {
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

  const navigateImmediately = useCallback(async (href: string, options?: {
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
      
      // Shorter fallback completion for immediate feedback
      setTimeout(() => {
        if (isNavigating) {
          setIsNavigating(false);
        }
      }, 500); // Reduced from 1000ms to 500ms
      
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
    }
  }, [router, isNavigating]);

  const navigateWithLoading = useCallback(async (href: string, setLoading?: (loading: boolean) => void, options?: {
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
  }) => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    if (setLoading) setLoading(true);
    
    try {
      // Use replace for better performance when appropriate
      const shouldReplace = options?.replace || href === window.location.pathname;
      
      if (shouldReplace) {
        router.replace(href, options);
      } else {
        router.push(href, options);
      }
      
      // Shorter fallback completion for immediate feedback
      setTimeout(() => {
        if (isNavigating) {
          setIsNavigating(false);
          if (setLoading) setLoading(false);
        }
      }, 300); // Very short fallback for immediate feedback
      
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
      if (setLoading) setLoading(false);
    }
  }, [router, isNavigating]);

  return {
    navigateImmediately,
    navigateWithLoading,
    isNavigating
  };
};

