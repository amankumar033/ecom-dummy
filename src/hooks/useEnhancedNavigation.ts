'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';

interface NavigationOptions {
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  prefetch?: boolean;
}

export const useEnhancedNavigation = () => {
  const router = useRouter();
  const { startNavigation, endNavigation } = useNavigation();

  const navigate = useCallback(async (
    href: string, 
    options: NavigationOptions = {}
  ) => {
    try {
      startNavigation();
      
      // Add a small delay to ensure loading state is visible for fast navigations
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (options.replace) {
        router.replace(href);
      } else {
        router.push(href);
      }
      
      // End navigation after a short delay to allow the new page to load
      setTimeout(() => {
        endNavigation();
      }, 100);
      
    } catch (error) {
      console.error('Navigation error:', error);
      endNavigation();
    }
  }, [router, startNavigation, endNavigation]);

  const navigateWithLoading = useCallback(async (
    href: string,
    options: NavigationOptions = {}
  ) => {
    startNavigation();
    
    // Prefetch the page for faster loading
    if (options.prefetch !== false) {
      try {
        await router.prefetch(href);
      } catch (error) {
        console.warn('Prefetch failed:', error);
      }
    }
    
    // Navigate with a minimum loading time for better UX
    setTimeout(async () => {
      try {
        if (options.replace) {
          router.replace(href);
        } else {
          router.push(href);
        }
      } catch (error) {
        console.error('Navigation error:', error);
      } finally {
        setTimeout(() => endNavigation(), 200);
      }
    }, 150);
  }, [router, startNavigation, endNavigation]);

  return {
    navigate,
    navigateWithLoading,
    router,
  };
};
