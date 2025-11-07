'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

export const useUltraFastNavigation = () => {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const navigateUltraFast = useCallback(async (href: string, options?: {
    showProgress?: boolean;
  }) => {
    const { showProgress = true } = options || {};

    if (isNavigating) return;
    
    setIsNavigating(true);

    // Show progress bar immediately
    if (showProgress) {
      document.dispatchEvent(new CustomEvent('navigationStart'));
    }

    try {
      // Immediate navigation - no delays
      router.push(href);
      
      // Complete immediately
      setTimeout(() => {
        setIsNavigating(false);
        if (showProgress) {
          document.dispatchEvent(new CustomEvent('navigationComplete'));
        }
      }, 5); // Minimal delay for instant navigation
      
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
    }
  }, [router, isNavigating]);

  return { 
    navigateUltraFast,
    isNavigating 
  };
};

