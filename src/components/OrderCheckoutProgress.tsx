'use client';

import React from 'react';
import ProgressBar from './ProgressBar';

interface OrderCheckoutProgressProps {
  isVisible: boolean;
  progress: number;
  message: string;
}

const OrderCheckoutProgress: React.FC<OrderCheckoutProgressProps> = ({
  isVisible,
  progress,
  message
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-95 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-gray-200">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Your Order</h3>
          <p className="text-sm text-gray-600">{message}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <ProgressBar 
            progress={progress} 
            message="Processing..." 
            color="green"
            className="mb-4"
          />
        </div>

        {/* Loading Steps */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Validating order details</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full ${progress > 25 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className="text-sm text-gray-600">Checking product availability</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full ${progress > 50 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className="text-sm text-gray-600">Processing payment</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full ${progress > 75 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className="text-sm text-gray-600">Creating order</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full ${progress > 90 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className="text-sm text-gray-600">Preparing confirmation</span>
          </div>
        </div>

        {/* Estimated Time */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Estimated time: {Math.max(2, Math.ceil((100 - progress) / 25))} seconds
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderCheckoutProgress;
