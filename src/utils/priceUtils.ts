// Utility function for consistent INR price formatting
export const formatPrice = (price: number | string): string => {
  const numericPrice = typeof price === 'string' ? parseFloat(price) || 0 : price;
  
  // Format with Indian number system (commas in thousands) and add ₹ symbol
  const formattedNumber = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericPrice);
  
  return `₹${formattedNumber}`;
};

// Format price without currency symbol (just the number with commas)
export const formatPriceNumber = (price: number | string): string => {
  const numericPrice = typeof price === 'string' ? parseFloat(price) || 0 : price;
  
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericPrice);
};

// Format price with ₹ symbol manually (for cases where we want more control)
export const formatPriceWithSymbol = (price: number | string): string => {
  const numericPrice = typeof price === 'string' ? parseFloat(price) || 0 : price;
  
  return `₹${numericPrice.toFixed(2)}`;
};
