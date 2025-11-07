'use client';

import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  message?: string;
  showPercentage?: boolean;
  className?: string;
  color?: 'blue' | 'green' | 'amber' | 'red';
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  message = 'Processing...',
  showPercentage = true,
  className = '',
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    amber: 'bg-amber-600',
    red: 'bg-red-600'
  };

  const progressColor = colorClasses[color];

  return (
    <div className={`w-full ${className}`}>
      {message && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{message}</span>
          {showPercentage && (
            <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-1">
        <div
          className={`${progressColor} h-1 rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
