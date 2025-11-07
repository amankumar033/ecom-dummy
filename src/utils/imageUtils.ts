// List of available images in the public folder (fallback images)
const availableImages = [
  '/engine1.png',
  '/engine2.png', 
  '/engine3.png',
  '/engine4.png',
  '/engine5.png',
  '/engine.png',
  '/oil1.png',
  '/oil2.png',
  '/oil3.png',
  '/oil4.png',
  '/oil5.png',
  '/oil.png',
  '/tyres.png',
  '/tyres2.png',
  '/wiper.png',
  '/brakes.png',
  '/batteries.png',
  '/toolbag.png',
  '/cart.png',
  '/favourite.png',
  '/search.png',
  '/location.png',
  '/person.png',
  '/telephone.png',
  '/headphone.png',
  '/face.png',
  '/palette.png',
  '/filters.png',
  '/spring.png',
  '/damping.png',
  '/fluid.png',
  '/electrics.png',
  '/interiors.png',
  '/body.png',
  '/kit.png',
  '/lines.png',
  '/reverse.png',
  '/down.png',
  '/car-repair.png',
  '/car-bg.png',
  '/advertisement.png',
  '/img1.png',
  '/img2.png',
  '/img3.png',
  '/pst1.png',
  '/pst2.png',
  '/woody.jpg',
  '/wiper-blurred.jpg',
  '/wiper-blurred.jpeg'
];

// Invalid image paths that should be replaced
const invalidPaths = [
  '/hood.png', 
  '/turbo.png', 
  '/headlights.png', 
  '/hood', 
  '/turbo', 
  '/headlights',
  '/placeholder-product.jpg'
];

export const isExternalImageSrc = (src: string): boolean => {
  return typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'));
};

/**
 * Validates and returns a valid image source
 * @param imageUrl - The original image URL (can be string, ArrayBuffer-like, or null/undefined)
 * @returns A valid image URL or fallback
 */
export const getValidImageSrc = (imageUrl: string | ArrayBuffer | null | undefined): string => {
  // If no image URL provided, return default
  if (!imageUrl) {
    return '/engine1.png';
  }

  // Explicitly allow pre-built data URLs
  if (typeof imageUrl === 'string' && imageUrl.startsWith('data:image/')) {
    return imageUrl;
  }

  // Handle base64 strings (converted from Buffer in API)
  if (typeof imageUrl === 'string' && imageUrl.length > 100 && !imageUrl.startsWith('http') && !imageUrl.startsWith('/') && !imageUrl.startsWith('data:')) {
    return `data:image/jpeg;base64,${imageUrl}`;
  }

  // Ensure imageUrl is a string for further processing
  const imageUrlString = String(imageUrl);
  
  // Check for invalid URLs
  if (imageUrlString === 'https://example.com/' || 
      imageUrlString === 'https://example.com' ||
      imageUrlString === '' ||
      imageUrlString === null) {
    return '/engine1.png';
  }
  
  // Check for specific problematic paths that are causing 404s
  if (invalidPaths.includes(imageUrlString)) {
    return '/engine1.png';
  }
  
  // Check for relative paths that don't exist
  if (imageUrlString.startsWith('/') && !imageUrlString.includes('.')) {
    return '/engine1.png';
  }
  
  // If the image path is in our available images list, use it
  if (availableImages.includes(imageUrlString)) {
    return imageUrlString;
  }
  
  // For external URLs (http/https), validate and return them
  if (imageUrlString.startsWith('http://') || imageUrlString.startsWith('https://')) {
    // Basic URL validation
    try {
      new URL(imageUrlString);
      return imageUrlString;
    } catch {
      return '/engine1.png';
    }
  }
  
  // For relative paths that might be valid, check if they exist in available images
  if (imageUrlString.startsWith('/') && availableImages.includes(imageUrlString)) {
    return imageUrlString;
  }
  
  // For any other path, return default
  return '/engine1.png';
};

export const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = event.target as HTMLImageElement;
  target.src = '/engine1.png';
  target.onerror = null; // Prevent infinite loop
};

export const getRandomFallbackImage = (): string => {
  const randomIndex = Math.floor(Math.random() * availableImages.length);
  return availableImages[randomIndex];
}; 