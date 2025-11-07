'use client';

import { useEffect, useRef } from 'react';

const PerformanceOptimizer = () => {
  const isPausedRef = useRef(false);

  useEffect(() => {
    const handlePauseHeavyOperations = () => {
      console.log('PerformanceOptimizer: Pausing heavy operations');
      isPausedRef.current = true;
    };

    const handleResumeHeavyOperations = () => {
      console.log('PerformanceOptimizer: Resuming heavy operations');
      isPausedRef.current = false;
    };

    // Add global event listeners
    document.addEventListener('pauseHeavyOperations', handlePauseHeavyOperations);
    document.addEventListener('resumeHeavyOperations', handleResumeHeavyOperations);

    // Expose pause state globally for other components to check
    (window as any).isHeavyOperationsPaused = () => isPausedRef.current;

    return () => {
      document.removeEventListener('pauseHeavyOperations', handlePauseHeavyOperations);
      document.removeEventListener('resumeHeavyOperations', handleResumeHeavyOperations);
    };
  }, []);

  return null; // This component doesn't render anything
};

export default PerformanceOptimizer;
