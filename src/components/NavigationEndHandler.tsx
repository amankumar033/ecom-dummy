'use client';

import { useEffect } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';

const NavigationEndHandler: React.FC = () => {
  const { endNavigation } = useNavigation();

  useEffect(() => {
    // End navigation when component mounts (page loads)
    const timer = setTimeout(() => {
      endNavigation();
    }, 50);

    // Also end navigation when window load event fires
    const handleLoad = () => {
      endNavigation();
    };

    window.addEventListener('load', handleLoad);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('load', handleLoad);
    };
  }, [endNavigation]);

  return null;
};

export default NavigationEndHandler;
