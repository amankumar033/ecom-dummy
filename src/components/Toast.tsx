"use client";
import React, { useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ type, message, onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-green-500 shadow-2xl text-white',
          icon: 'text-white',
          closeButton: 'text-white hover:text-green-100'
        };
      case 'error':
        return {
          container: 'bg-red-500 shadow-2xl text-white',
          icon: 'text-white',
          closeButton: 'text-white hover:text-red-100'
        };
      case 'warning':
        return {
          container: 'bg-orange-500 shadow-2xl text-white',
          icon: 'text-white',
          closeButton: 'text-white hover:text-orange-100'
        };
      case 'info':
        return {
          container: 'bg-blue-500 shadow-2xl text-white',
          icon: 'text-white',
          closeButton: 'text-white hover:text-blue-100'
        };
      default:
        return {
          container: 'bg-gray-500 shadow-2xl text-white',
          icon: 'text-white',
          closeButton: 'text-white hover:text-gray-100'
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'info':
        return (
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`fixed top-4 right-2 sm:right-4 z-50 max-w-xs sm:max-w-sm w-full rounded-lg p-3 sm:p-4 ${getToastStyles().container} transform transition-all duration-75 ease-out animate-slide-in-fast`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-2 sm:mr-3">
          {getIcon()}
        </div>
        <div className="flex-1 pt-0.5">
          <p className="text-xs sm:text-sm font-medium">{message}</p>
        </div>
        <div className="ml-2 sm:ml-4 flex-shrink-0">
          <button
            onClick={onClose}
            className={`inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-gray-600 ${getToastStyles().closeButton} transition-colors duration-75`}
          >
            <span className="sr-only">Close</span>
            <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// ToastContainer component to display all toasts
export const ToastContainer: React.FC = () => {
  const { toasts, hideToast } = useToast();

  return (
    <div className="fixed top-4 right-2 sm:right-4 z-[9999999] space-y-2" style={{ zIndex: 9999999 }}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => hideToast(toast.id)}
          duration={toast.duration}
        />
      ))}
    </div>
  );
};

export default Toast; 