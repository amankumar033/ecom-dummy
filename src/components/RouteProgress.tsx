'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function RouteProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const startProgress = () => {
    setVisible(true);
    setProgress(10);

    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + Math.random() * 15));
    }, 200);

    const completeTimeout = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setVisible(false), 300);
      setTimeout(() => setProgress(0), 600);
    }, 1200);

    return () => {
      clearInterval(interval);
      clearTimeout(completeTimeout);
    };
  };

  useEffect(() => {
    const cleanup = startProgress();
    return cleanup;
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('a, button, [data-progress]')) {
        startProgress();
      }
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleClick, { capture: true } as any);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '3px',
        zIndex: 1700,
      }}
    >
      <div
        style={{
          width: `${Math.min(progress, 100)}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #ef4444, #dc2626)',
          boxShadow: '0 0 10px rgba(220,38,38,0.6)',
          transition: 'width 200ms ease-out',
        }}
      />
    </div>
  );
}


