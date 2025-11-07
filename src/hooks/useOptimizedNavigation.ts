'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';

export const useOptimizedNavigation = () => {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  // Listen for Next.js router events
  useEffect(() => {
    const handleRouteChangeStart = () => {
      setIsNavigating(true);
      window.dispatchEvent(new CustomEvent('navigationStart'));
    };

    const handleRouteChangeComplete = () => {
      setIsNavigating(false);
      window.dispatchEvent(new CustomEvent('navigationComplete'));
    };

    const handleRouteChangeError = () => {
      setIsNavigating(false);
      window.dispatchEvent(new CustomEvent('navigationComplete'));
    };

    // Add event listeners for Next.js router events
    window.addEventListener('beforeunload', handleRouteChangeStart);
    window.addEventListener('load', handleRouteChangeComplete);
    window.addEventListener('error', handleRouteChangeError);

    return () => {
      window.removeEventListener('beforeunload', handleRouteChangeStart);
      window.removeEventListener('load', handleRouteChangeComplete);
      window.removeEventListener('error', handleRouteChangeError);
    };
  }, []);

  const navigateTo = useCallback(async (href: string) => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    
    try {
      router.push(href);
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
    }
  }, [router, isNavigating]);

  const navigateWithProgress = useCallback(async (href: string) => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    window.dispatchEvent(new CustomEvent('navigationStart'));
    
    try {
      // Navigate immediately
      router.push(href);
      
      // Fallback completion after 800ms
      setTimeout(() => {
        if (isNavigating) {
          setIsNavigating(false);
          window.dispatchEvent(new CustomEvent('navigationComplete'));
        }
      }, 800);
      
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
      window.dispatchEvent(new CustomEvent('navigationComplete'));
    }
  }, [router, isNavigating]);

  return {
    navigateTo,
    navigateWithProgress,
    isNavigating
  };
};
