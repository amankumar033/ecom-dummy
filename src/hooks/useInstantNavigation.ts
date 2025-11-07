'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

export const useInstantNavigation = () => {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const navigate = useCallback(async (href: string, options?: { 
    showProgress?: boolean; 
    instant?: boolean;
    onStart?: () => void;
    onComplete?: () => void;
    setLoading?: (loading: boolean) => void;
  }) => {
    const { showProgress = true, instant = true, onStart, onComplete, setLoading } = options || {};

    if (isNavigating) return;
    
    setIsNavigating(true);
    if (setLoading) setLoading(true);

    // Immediate UI feedback
    if (onStart) onStart();
    
    if (showProgress) {
      // Dispatch custom event for progress bar
      document.dispatchEvent(new CustomEvent('navigationStart', { 
        detail: { href, instant } 
      }));
    }

    try {
      // Prefetch to speed up navigation
      try {
        router.prefetch?.(href);
      } catch {}

      // Immediate navigation with progress bar
      router.push(href);
      
      // Quick completion with progress bar
      setTimeout(() => {
        setIsNavigating(false);
        if (setLoading) setLoading(false);
        if (showProgress) {
          document.dispatchEvent(new CustomEvent('navigationComplete'));
        }
        if (onComplete) onComplete();
      }, 50); // Reduced delay for faster navigation
      
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
      if (setLoading) setLoading(false);
      if (onComplete) onComplete();
    }
  }, [router, isNavigating]);

  return { 
    navigate,
    isNavigating 
  };
};
