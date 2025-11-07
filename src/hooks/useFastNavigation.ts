'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

export const useFastNavigation = () => {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const navigateFast = useCallback(async (href: string, options?: {
    showProgress?: boolean;
    priority?: 'high' | 'normal';
  }) => {
    const { showProgress = true, priority = 'high' } = options || {};

    if (isNavigating) return;
    
    setIsNavigating(true);

    // For high priority navigation, pause any heavy operations
    if (priority === 'high') {
      // Dispatch event to pause heavy operations
      document.dispatchEvent(new CustomEvent('pauseHeavyOperations'));
    }

    // Show progress bar immediately
    if (showProgress) {
      document.dispatchEvent(new CustomEvent('navigationStart'));
    }

    try {
      // Immediate navigation
      router.push(href);
      
      // Quick completion
      setTimeout(() => {
        setIsNavigating(false);
        if (showProgress) {
          document.dispatchEvent(new CustomEvent('navigationComplete'));
        }
        // Resume heavy operations after navigation
        if (priority === 'high') {
          document.dispatchEvent(new CustomEvent('resumeHeavyOperations'));
        }
      }, 50); // Very short delay
      
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
      if (priority === 'high') {
        document.dispatchEvent(new CustomEvent('resumeHeavyOperations'));
      }
    }
  }, [router, isNavigating]);

  return { 
    navigateFast,
    isNavigating 
  };
};

