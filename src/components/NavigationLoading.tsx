'use client';

import React, { useEffect, useState } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';

interface NavigationLoadingProps {
  delay?: number; // Delay before showing loading (ms)
  minDuration?: number; // Minimum duration to show loading (ms)
}

const NavigationLoading: React.FC<NavigationLoadingProps> = ({ 
  delay = 50, 
  minDuration = 100 
}) => {
  const { isNavigating, endNavigation } = useNavigation();
  const [showLoading, setShowLoading] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    let delayTimer: ReturnType<typeof setTimeout>;
    let minDurationTimer: ReturnType<typeof setTimeout>;

    if (isNavigating) {
      // Start delay timer
      delayTimer = setTimeout(() => {
        setShowLoading(true);
        setStartTime(Date.now());
      }, delay);
    } else {
      // If navigation ended, check if we need to wait for minimum duration
      if (showLoading && startTime) {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minDuration - elapsed);
        
        minDurationTimer = setTimeout(() => {
          setShowLoading(false);
          setStartTime(null);
        }, remaining);
      } else {
        setShowLoading(false);
        setStartTime(null);
      }
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      if (minDurationTimer) clearTimeout(minDurationTimer);
    };
  }, [isNavigating, showLoading, startTime, delay, minDuration]);

  if (!showLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-[9999] transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 transform transition-all duration-300 scale-100">
        <div className="flex flex-col items-center space-y-4">
          {/* Animated spinner */}
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-400 rounded-full animate-spin" style={{ animationDuration: '1.5s' }}></div>
          </div>
          
          {/* Loading text */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Page</h3>
            <p className="text-sm text-gray-600">Please wait while we prepare your content...</p>
          </div>
          
          {/* Progress dots */}
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationLoading;
