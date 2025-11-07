import React from 'react';

interface ProductSkeletonProps {
  className?: string;
}

const ProductSkeleton: React.FC<ProductSkeletonProps> = ({ className = "" }) => {
  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden flex flex-col h-full animate-pulse ${className}`}>
      {/* Product Image Skeleton */}
      <div className="relative h-40 sm:h-48 w-full bg-gray-200"></div>
      
      {/* Product Info Skeleton */}
      <div className="p-3 sm:p-4 flex flex-col flex-grow">
        {/* Product Name Skeleton */}
        <div className="h-6 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded mb-1 w-3/4"></div>
        
        {/* Rating Skeleton */}
        <div className="flex items-center mb-2">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="w-12 h-3 bg-gray-200 rounded ml-1"></div>
        </div>
        
        {/* Price Skeleton */}
        <div className="mb-3">
          <div className="w-20 h-5 bg-gray-200 rounded"></div>
        </div>
      </div>
      
      {/* Button Skeleton */}
      <div className="p-3 sm:p-4 pt-0 mt-auto">
        <div className="w-full h-10 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
};

export default ProductSkeleton;
