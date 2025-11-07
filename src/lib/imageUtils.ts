// Utility function to convert Buffer to base64 string
export const bufferToBase64 = (buffer: Buffer | null | undefined): string | null => {
  if (!buffer) return null;
  
  try {
    // Convert Buffer to base64 string
    const base64 = buffer.toString('base64');
    
    // Determine image type based on buffer header
    let mimeType = 'image/jpeg'; // default
    
    if (buffer.length >= 4) {
      const header = buffer.slice(0, 4);
      
      // PNG signature: 89 50 4E 47
      if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
        mimeType = 'image/png';
      }
      // JPEG signature: FF D8 FF
      else if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
        mimeType = 'image/jpeg';
      }
      // GIF signature: 47 49 46 38
      else if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) {
        mimeType = 'image/gif';
      }
      // WebP signature: 52 49 46 46
      else if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
        mimeType = 'image/webp';
      }
    }
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting buffer to base64:', error);
    return null;
  }
};

// Utility function to check if a string is a valid base64 image
export const isValidBase64Image = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  
  // Check if it's already a data URL
  if (str.startsWith('data:image/')) return true;
  
  // Check if it's a valid base64 string
  try {
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(str);
  } catch {
    return false;
  }
};

// Utility function to process image data from database
export const processImageData = (imageData: any): string | null => {
  if (!imageData) return null;
  
  // If it's already a string (URL or base64), return as is
  if (typeof imageData === 'string') {
    if (imageData.startsWith('data:image/') || imageData.startsWith('http')) {
      return imageData;
    }
    // If it's a base64 string without data URL prefix, add it
    if (isValidBase64Image(imageData)) {
      return `data:image/jpeg;base64,${imageData}`;
    }
  }
  
  // If it's a Buffer, convert to base64
  if (Buffer.isBuffer(imageData)) {
    return bufferToBase64(imageData);
  }
  
  return null;
};
