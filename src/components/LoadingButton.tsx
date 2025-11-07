'use client';

import React, { useState, useCallback } from 'react';

interface LoadingButtonProps {
  children: React.ReactNode;
  onClick?: () => void | Promise<void>;
  className?: string;
  loadingClassName?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  showSpinner?: boolean;
  instantFeedback?: boolean;
  loadingText?: string;
  href?: string;
  onNavigate?: (href: string) => void;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  children,
  onClick,
  className = '',
  loadingClassName = '',
  disabled = false,
  type = 'button',
  showSpinner = true,
  instantFeedback = true,
  loadingText,
  href,
  onNavigate
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (disabled || isLoading) return;

    if (instantFeedback) {
      setIsLoading(true);
    }

    try {
      if (href && onNavigate) {
        // Handle navigation
        onNavigate(href);
      } else if (onClick) {
        // Handle regular click
        await onClick();
      }
    } catch (error) {
      console.error('Button action failed:', error);
    } finally {
      if (instantFeedback) {
        // Keep loading state for a minimum time for visual feedback
        setTimeout(() => setIsLoading(false), 100); // Reduced from 200ms to 100ms for faster response
      }
    }
  }, [onClick, disabled, isLoading, instantFeedback, href, onNavigate]);

  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      suppressHydrationWarning
      className={`
        ${className}
        ${isLoading ? loadingClassName : ''}
        transition-all duration-150 ease-out
        ${isLoading ? 'cursor-not-allowed opacity-80' : 'hover:scale-105 active:scale-95'}
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      <div className="flex items-center justify-center gap-2">
        {isLoading && showSpinner && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
        )}
        <span className={isLoading ? 'opacity-80' : ''}>
          {isLoading && loadingText ? loadingText : children}
        </span>
      </div>
    </button>
  );
};

export default LoadingButton;
