"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';


import Link from 'next/link';
import Image from 'next/image';
import { getValidImageSrc, handleImageError } from '@/utils/imageUtils';
import DescriptionDropdown from '@/components/DescriptionDropdown';

type Product = {
  product_id: string;
  name: string;
  description: string;
  features?: string;
  sale_price: number;
  original_price: number;
  rating: number;
  image_1: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
  category_id: string;
  category_name?: string;
  subcategory_name?: string;
  brand_name: string;
  sub_brand_name?: string;
  stock_quantity: number;
  is_active: number;
  is_featured: number;
  is_hot_deal: number;
  created_at: string;
  updated_at: string;
  dealer_id: string;
};



type Review = {
  id: number;
  user_name: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
};

const ProductDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const { cartItems, addToCart, updateQuantity } = useCart();
  const { showToast } = useToast();


  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1); // Default quantity should be 1
  const [originalStock, setOriginalStock] = useState(0);
  
  // Image gallery state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const autoScrollInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Cursor zoom state
  const [isCursorZoomEnabled, setIsCursorZoomEnabled] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);



  const productSlug = params.slug;

  // Static customer reviews
  const customerReviews: Review[] = [
    {
      id: 1,
      user_name: "John Smith",
      rating: 5,
      comment: "Excellent quality product! Fast delivery and exactly as described. Highly recommend!",
      date: "2024-01-15",
      verified: true
    },
    {
      id: 2,
      user_name: "Sarah Johnson",
      rating: 4,
      comment: "Good product, works perfectly. The only minor issue was the packaging could be better.",
      date: "2024-01-10",
      verified: true
    },
    {
      id: 3,
      user_name: "Mike Davis",
      rating: 5,
      comment: "Amazing product quality! Exceeded my expectations. Will definitely buy again.",
      date: "2024-01-08",
      verified: true
    },
    {
      id: 4,
      user_name: "Emily Wilson",
      rating: 4,
      comment: "Solid product, good value for money. Delivery was on time.",
      date: "2024-01-05",
      verified: true
    },
    {
      id: 5,
      user_name: "David Brown",
      rating: 5,
      comment: "Perfect fit and excellent performance. Very satisfied with this purchase!",
      date: "2024-01-03",
      verified: true
    }
  ];

  console.log('Product detail page - productSlug:', productSlug, 'type:', typeof productSlug, 'params:', params);



  // Fetch product details
  const fetchProduct = async () => {
    try {
      setLoading(true);
      console.log('Fetching product with slug:', productSlug);
      
      const response = await fetch(`/api/products/${productSlug}`);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Product API error:', data);
        setError(data.message || 'Failed to load product details');
        return;
      }
      
      console.log('Product data received:', data);
      setProduct(data);
      setOriginalStock(parseInt(data.stock_quantity) || 0);
      
      // Fetch related products
      if (data.category_id) {
        fetchRelatedProducts(data.category_id, data.product_id);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  // Fetch related products
  const fetchRelatedProducts = async (categoryId: string, excludeProductId: string) => {
    try {
      setRelatedLoading(true);
      const response = await fetch(`/api/products/related?categoryId=${categoryId}&excludeProductId=${excludeProductId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.products) {
          setRelatedProducts(data.products);
        } else {
          console.error('Related products API returned error:', data.message);
          setRelatedProducts([]);
        }
      } else {
        console.error('Related products API request failed');
        setRelatedProducts([]);
      }
    } catch (error) {
      console.error('Error fetching related products:', error);
      setRelatedProducts([]);
    } finally {
      setRelatedLoading(false);
    }
  };

  // Fetch product data on component mount
  useEffect(() => {
    if (params?.slug) {
      fetchProduct();
    }
  }, [params?.slug]);

  // Listen for cart updates to refresh product (for stock updates)
  useEffect(() => {
    const handleCartUpdate = (event: CustomEvent) => {
      console.log('Product detail page received cart update, updating product locally for stock updates');
      
      // Update product locally instead of reloading from server
      if (event.detail && event.detail.cartItems && product) {
        const cartItem = event.detail.cartItems.find((item: any) => item.product_id === product.product_id);
        if (cartItem) {
          // Product is in cart, calculate available stock using original stock value
          const cartQuantity = cartItem.quantity || 0;
          const availableStock = Math.max(0, originalStock - cartQuantity);
          setProduct(prev => prev ? { ...prev, stock_quantity: availableStock } : null);
        } else {
          // Product is not in cart, restore original stock
          setProduct(prev => prev ? { ...prev, stock_quantity: originalStock } : null);
        }
      } else if (event.detail && product) {
        // If no cart items, restore product to original stock
        console.log(`Product ${product.name}: Restored original stock ${originalStock} (no cart items)`);
        setProduct(prev => prev ? { ...prev, stock_quantity: originalStock } : null);
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate as EventListener);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate as EventListener);
    };
  }, [product, originalStock]);

  // Listen for cartItems changes from CartContext - only when product is loaded
  useEffect(() => {
    if (product && originalStock > 0) {
      console.log('Product detail page cartItems changed, updating product locally');
      const cartItem = cartItems.find(item => item.product_id === product.product_id);
      if (cartItem) {
        // Product is in cart, calculate available stock using original stock value
        const cartQuantity = cartItem.quantity || 0;
        const availableStock = Math.max(0, originalStock - cartQuantity);
        console.log(`Product ${product.name}: Original stock ${originalStock}, Cart quantity ${cartQuantity}, Available stock ${availableStock}`);
        
        // Only update if the stock quantity actually changed
        if (product.stock_quantity !== availableStock) {
          setProduct(prev => prev ? { ...prev, stock_quantity: availableStock } : null);
        }
      } else {
        // Product is not in cart, restore original stock
        console.log(`Product ${product.name}: Restored original stock ${originalStock} (not in cart)`);
        
        // Only update if the stock quantity actually changed
        if (product.stock_quantity !== originalStock) {
          setProduct(prev => prev ? { ...prev, stock_quantity: originalStock } : null);
        }
      }
    }
  }, [cartItems, product?.product_id, originalStock]);

  // Smart navigation to related products
  const handleRelatedProductClick = async (productSlug: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Related product clicked:', productSlug);
    
    // Show immediate visual feedback
    const target = event.currentTarget as HTMLElement;
    target.style.transform = 'scale(0.98)';
    target.style.transition = 'transform 0.1s ease';
    
    // Set a timeout to detect slow navigation
    const slowNavigationTimeout = setTimeout(() => {
      console.log(`🐌 Slow navigation detected for related product: ${productSlug}`);
      document.dispatchEvent(new CustomEvent('navigationStart'));
    }, 300); // Show progress bar if navigation takes longer than 300ms
    
    // Navigate
    router.push(`/products/${productSlug}`);
    
    // Reset transform after navigation
    setTimeout(() => {
      target.style.transform = '';
      target.style.transition = '';
    }, 100);
    
    // Clear timeout if navigation was fast
    setTimeout(() => {
      clearTimeout(slowNavigationTimeout);
    }, 500);
  };

  // Add to cart functionality
  const handleAddToCart = async () => {
    if (!product) return;
    
    // Check if item already exists in cart
    const existingItem = cartItems.find(item => item.product_id === product.product_id);
    
    if (existingItem) {
      // If item exists, add the selected quantity to existing quantity
      const currentQuantity = existingItem.quantity;
      const newTotalQuantity = currentQuantity + quantity;
      
      // Check if the new total doesn't exceed available stock
      if (newTotalQuantity <= originalStock) {
        await updateQuantity(product.product_id, newTotalQuantity);
      } else {
        // If it would exceed stock, set to maximum available
        const maxAllowed = originalStock;
        await updateQuantity(product.product_id, maxAllowed);
        showToast('warning', `Quantity adjusted to available stock (${maxAllowed})`);
      }
    } else {
      // If item doesn't exist, add it with quantity 1 first
      await addToCart({
        product_id: product.product_id,
        name: product.name || 'Product',
        price: product.sale_price,
        image: product.image_1
      });
      
      // If quantity is more than 1, update it in the next render cycle
      if (quantity > 1) {
        // Use a longer delay to ensure the cart state is fully updated
        setTimeout(async () => {
          try {
            // Check if the quantity doesn't exceed stock
            if (quantity <= originalStock) {
              await updateQuantity(product.product_id, quantity);
            } else {
              // If it would exceed stock, set to maximum available
              const maxAllowed = originalStock;
              await updateQuantity(product.product_id, maxAllowed);
              showToast('warning', `Quantity adjusted to available stock (${maxAllowed})`);
            }
          } catch (error) {
            console.error('Error updating quantity after adding to cart:', error);
          }
        }, 500); // Increased delay to ensure cart state is stable
      }
    }
  };

  // Handle quantity increase (local only, no cart update)
  const handleQuantityIncrease = () => {
    if (!product) return;
    
    const cartItem = cartItems.find(item => item.product_id === product.product_id);
    const cartQuantity = cartItem ? cartItem.quantity : 0;
    const availableStock = originalStock - cartQuantity;
    
    const newQuantity = quantity + 1;
    
    if (newQuantity <= availableStock) {
      setQuantity(newQuantity);
    } else {
      console.log(`Only ${availableStock} units available in stock`);
    }
  };

  // Handle quantity decrease (local only, no cart update)
  const handleQuantityDecrease = () => {
    if (quantity <= 1) return; // Minimum quantity should be 1
    setQuantity(quantity - 1);
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  // Render star rating
  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <svg
        key={i}
        className={`w-5 h-5 ${i < Math.floor(Number(rating) || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ));
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get all product images
  const getProductImages = () => {
    const images = [];
    if (product?.image_1) images.push(product.image_1);
    if (product?.image_2) images.push(product.image_2);
    if (product?.image_3) images.push(product.image_3);
    if (product?.image_4) images.push(product.image_4);
    return images;
  };

  // Auto-scroll functionality
  useEffect(() => {
    if (!isAutoScrolling) return;
    
    const images = getProductImages();
    if (images.length <= 1) return;

    autoScrollInterval.current = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000); // Change image every 3 seconds

    return () => {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
      }
    };
  }, [isAutoScrolling, product]);

  // Keyboard shortcuts for zoom controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return; // Don't handle shortcuts when typing in input fields
      }

      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault();
          zoomIn();
          break;
        case '-':
          event.preventDefault();
          zoomOut();
          break;
        case '0':
          event.preventDefault();
          resetZoom();
          break;
        case 'Escape':
          event.preventDefault();
          resetZoom();
          break;
        case 'c':
        case 'C':
          event.preventDefault();
          toggleCursorZoom();
          break;
        case 'd':
        case 'D':
          event.preventDefault();
          resetToDefault();
          break;
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingActive) {
        setIsDraggingActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [zoomLevel, isCursorZoomEnabled]);

  // Cursor zoom functionality
  const toggleCursorZoom = useCallback(() => {
    const newCursorZoomState = !isCursorZoomEnabled;
    setIsCursorZoomEnabled(newCursorZoomState);
    if (!newCursorZoomState) {
      setIsHovering(false);
      setCursorPosition({ x: 0, y: 0 });
    }
  }, [isCursorZoomEnabled]);

  // Pause auto-scroll on hover
  const handleImageHover = () => {
    setIsAutoScrolling(false);
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
    }
  };

  const handleImageLeave = () => {
    setIsAutoScrolling(true);
  };

  // Navigation functions
  const nextImage = () => {
    const images = getProductImages();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
    // Reset zoom when changing images
    setZoomLevel(1);
    setIsZoomed(false);
    setDragPosition({ x: 0, y: 0 });
    setIsDragEnabled(false);
    setIsDraggingActive(false);
    // Reset cursor zoom state
    setIsHovering(false);
    setCursorPosition({ x: 0, y: 0 });
  };

  const prevImage = () => {
    const images = getProductImages();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    // Reset zoom when changing images
    setZoomLevel(1);
    setIsZoomed(false);
    setDragPosition({ x: 0, y: 0 });
    setIsDragEnabled(false);
    setIsDraggingActive(false);
    // Reset cursor zoom state
    setIsHovering(false);
    setCursorPosition({ x: 0, y: 0 });
  };

  // Zoom control functions
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
    setIsZoomed(true);
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
    if (zoomLevel <= 1) {
      setIsZoomed(false);
    }
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setIsZoomed(false);
  };

  const resetToDefault = () => {
    // Reset all zoom and interaction states to default
    setZoomLevel(1);
    setIsZoomed(false);
    setDragPosition({ x: 0, y: 0 });
    setIsDragEnabled(false);
    setIsDraggingActive(false);
    setIsCursorZoomEnabled(false);
    setIsHovering(false);
    setCursorPosition({ x: 0, y: 0 });
  };

  const handleImageClick = () => {
    if (isZoomed) {
      resetZoom();
    } else {
      zoomIn();
    }
  };

  // Drag functionality
  const [isDragEnabled, setIsDragEnabled] = useState(false);
  const [isDraggingActive, setIsDraggingActive] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle drag if zoomed and drag is enabled
    if (isZoomed && isDragEnabled) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingActive(true);
      setDragStart({ x: e.clientX - dragPosition.x, y: e.clientY - dragPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle drag movement
    if (isDraggingActive && isZoomed && isDragEnabled) {
      e.preventDefault();
      e.stopPropagation();
      setDragPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
    
    // Handle cursor zoom movement
    if (isCursorZoomEnabled && !isZoomed && !isDraggingActive) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setCursorPosition({ x, y });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDraggingActive) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingActive(false);
    }
  };

  const toggleDragMode = () => {
    if (isZoomed) {
      const newDragState = !isDragEnabled;
      setIsDragEnabled(newDragState);
      if (!newDragState) {
        setDragPosition({ x: 0, y: 0 });
        setIsDraggingActive(false);
      }
    } else {
      // If not zoomed, zoom in first and then enable drag
      setZoomLevel(1.5);
      setIsZoomed(true);
      setIsDragEnabled(true);
      // Reset any cursor zoom state
      setIsHovering(false);
      setCursorPosition({ x: 0, y: 0 });
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-black">Loading product details...</p>
          <p className="text-sm text-gray-500 mt-2">Product: {productSlug}</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">Product Not Found</h1>
          <p className="text-black mb-6">{error || 'The product you are looking for does not exist.'}</p>
          <Link href="/shop" className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const discountPercentage = product.original_price > product.sale_price 
    ? Math.round(((product.original_price - product.sale_price) / product.original_price) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">


      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">
              <Link href="/" className="inline-flex items-center text-sm font-medium text-black hover:text-blue-600">
                <svg className="w-3 h-3 mr-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                  <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z"/>
                </svg>
                Home
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-3 h-3 text-black mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                </svg>
                <Link href="/shop" className="ml-1 text-sm font-medium text-black hover:text-blue-600 md:ml-2">
                  Shop
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg className="w-3 h-3 text-black mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                </svg>
                <span className="ml-1 text-sm font-medium text-black md:ml-2">{product.name}</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Product Image Gallery - Left */}
          <div className="relative lg:w-1/3 lg:ml-8">
                    <div 
          className="aspect-square bg-white rounded-lg overflow-hidden shadow-lg group relative"
          onMouseEnter={() => {
            handleImageHover();
            if (isCursorZoomEnabled && !isZoomed) {
              setIsHovering(true);
            }
          }}
          onMouseLeave={() => {
            handleImageLeave();
            if (isCursorZoomEnabled) {
              setIsHovering(false);
            }
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
              {(() => {
                const images = getProductImages();
                const currentImage = images[currentImageIndex];
                
                return (
                  <>
                    <Image
                      src={getValidImageSrc(currentImage)}
                      alt={`${product.name} - Image ${currentImageIndex + 1}`}
                      fill
                      className={`object-cover transition-transform duration-300 ${
                        isZoomed ? 'cursor-grab' : isCursorZoomEnabled ? 'cursor-crosshair' : 'cursor-pointer'
                      } ${isDraggingActive ? 'cursor-grabbing' : ''}`}
                      style={{ 
                        transform: isCursorZoomEnabled && isHovering && !isZoomed 
                          ? `scale(2)` 
                          : `scale(${zoomLevel}) translate(${dragPosition.x}px, ${dragPosition.y}px)`,
                        transformOrigin: isCursorZoomEnabled && isHovering && !isZoomed 
                          ? `${cursorPosition.x}% ${cursorPosition.y}%` 
                          : 'center',
                        maxWidth: 'none',
                        maxHeight: 'none'
                      }}
                      onError={handleImageError}
                      unoptimized={!!(currentImage && currentImage.startsWith('https://'))}
                      onClick={handleImageClick}
                    />
                    
                    {/* Zoom Controls */}
                    <div className="absolute top-2 right-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={zoomIn}
                        className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all duration-200"
                        title="Zoom In"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
                        </svg>
                      </button>
                      <button
                        onClick={zoomOut}
                        className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all duration-200"
                        title="Zoom Out"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                        </svg>
                      </button>
                      <button
                        onClick={toggleCursorZoom}
                        className={`bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all duration-200 hidden sm:block ${
                          isCursorZoomEnabled ? 'bg-blue-600' : ''
                        }`}
                        title={isCursorZoomEnabled ? "Disable Cursor Zoom" : "Enable Cursor Zoom"}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={resetToDefault}
                        className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all duration-200 hidden sm:block"
                        title="Reset to Original Size (D)"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                        </svg>
                      </button>
                      {isZoomed && (
                        <>
                          <button
                            onClick={toggleDragMode}
                            className={`bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all duration-200 hidden sm:block ${
                              isDragEnabled ? 'bg-blue-600' : ''
                            }`}
                            title={isDragEnabled ? "Disable Drag" : "Enable Drag"}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={resetZoom}
                            className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all duration-200 hidden sm:block"
                            title="Reset Zoom"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                    
                    {/* Zoom Level Indicator */}
                    {isZoomed && (
                      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs hidden sm:block">
                        {Math.round(zoomLevel * 100)}%
                      </div>
                    )}
                    
                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-2 top-[calc(50%+5px)] transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all duration-200 opacity-0 group-hover:opacity-100 hidden sm:block"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-2 top-[calc(50%+5px)] transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all duration-200 opacity-0 group-hover:opacity-100 hidden sm:block"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    )}
                    
                    {/* Image Counter */}
                    {images.length > 1 && (
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-sm">
                        {Math.max(1, currentImageIndex + 1)} / {images.length}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            
            {/* Hot Deal Badge */}
            {product.is_hot_deal ? (
              <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold z-10">
                HOT DEAL
              </div>
            ) : null}
            
            {/* Thumbnail Navigation */}
            {(() => {
              const images = getProductImages();
              if (images.length <= 1) return null;
              
              return (
                <div className="mt-4 flex justify-center space-x-2">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentImageIndex(index);
                        // Reset zoom when clicking thumbnails
                        setZoomLevel(1);
                        setIsZoomed(false);
                        setDragPosition({ x: 0, y: 0 });
                        setIsDragEnabled(false);
                        setIsDraggingActive(false);
                        // Reset cursor zoom state
                        setIsHovering(false);
                        setCursorPosition({ x: 0, y: 0 });
                      }}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                        index === currentImageIndex 
                          ? 'border-blue-500 scale-110' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <Image
                        src={getValidImageSrc(image)}
                        alt={`Thumbnail ${index + 1}`}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                        onError={handleImageError}
                        unoptimized={!!(image && image.startsWith('https://'))}
                      />
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* Product Description */}
            <div className="bg-white rounded-xl shadow-sm border p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Product Description
              </h3>
              <div className="prose prose-sm max-w-none text-gray-700">
                <div dangerouslySetInnerHTML={{ __html: product.description || '' }} />
              </div>
            </div>
          </div>

          {/* Product Details - Center */}
          <div className="space-y-4 lg:w-1/3 ml-2">
            {/* Product Status */}
            {!product.is_active && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 font-medium">⚠️ This product is currently unavailable</p>
              </div>
            )}

            {product.stock_quantity === 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-orange-600 font-medium">⚠️ This product is out of stock</p>
              </div>
            )}

            {/* Product Name */}
            <h1 className="text-3xl font-bold text-black">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center gap-1">
                {renderStars(product.rating)}
              </div>
              <span className="text-black">({product.rating}/5)</span>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-center space-x-4">
                <span className="text-3xl font-bold text-black">
                  {formatPrice(product.sale_price)}
                </span>
                {product.original_price > product.sale_price && (
                  <>
                    <span className="text-xl text-black line-through">
                      {formatPrice(product.original_price)}
                    </span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                      {discountPercentage}% OFF
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Product Info - Compact */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-black">Brand</span>
                <p className="text-black">{product.brand_name || 'Not specified'}</p>
              </div>
            </div>

            {/* Add to Cart Section - In center column */}
            {product.is_active && (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-black">Quantity:</label>
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={handleQuantityDecrease}
                      disabled={quantity <= 1 || product.stock_quantity === 0}
                      className="px-3 py-2 text-black hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <span className="px-4 py-2 border-x border-gray-300 min-w-[60px] text-center text-black">
                      {quantity}
                    </span>
                    <button
                      onClick={handleQuantityIncrease}
                      disabled={(() => {
                        const cartItem = cartItems.find(item => item.product_id === product.product_id);
                        const cartQuantity = cartItem ? cartItem.quantity : 0;
                        const availableStock = originalStock - cartQuantity;
                        return quantity >= availableStock;
                      })()}
                      className="px-3 py-2 text-black hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>

                {(() => {
                  const cartItem = cartItems.find(item => item.product_id === product.product_id);
                  const cartQuantity = cartItem ? cartItem.quantity : 0;
                  const availableStock = originalStock - cartQuantity;
                  const isOutOfStock = availableStock <= 0;
                  
                  return (
                                          <button
                        onClick={handleAddToCart}
                        disabled={isOutOfStock || quantity <= 0}
                        className={`w-full py-3 px-6 rounded-lg font-medium transition ${
                          isOutOfStock || quantity <= 0
                            ? 'bg-gray-300 text-black cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isOutOfStock ? (
                          'Out of Stock'
                        ) : (
                          `Add to Cart - ${formatPrice(product.sale_price * quantity)}`
                        )}
                      </button>
                  );
                })()}
              </div>
            )}

            {/* Product Information Section */}
            <div className="mt-8">
              <div className="bg-white rounded-lg border p-4">
                <h3 className="text-base font-semibold text-gray-800 mb-4">Product Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Categories */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <span className="text-sm font-medium text-gray-700">Category:</span>
                    </div>
                    <div className="ml-5">
                      <span className="text-sm text-gray-800">
                        {product.category_name || 'Not specified'}
                        {product.subcategory_name && (
                          <span className="text-gray-600">
                            {' '}• {product.subcategory_name}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Brand Information */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm font-medium text-gray-700">Brand:</span>
                    </div>
                    <div className="ml-5">
                      <span className="text-sm text-gray-800">
                        {product.brand_name || 'Not specified'}
                        {product.sub_brand_name && (
                          <span className="text-gray-600">
                            {' '}• {product.sub_brand_name}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Short Description as dropdown */}
          <div className="lg:w-1/3">
            <div className="space-y-4">
              {product.features && (
                <DescriptionDropdown
                  title="Features"
                  content={product.features}
                  defaultOpen={false}
                />
              )}
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-black mb-8">Related Products</h2>
          {relatedLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading related products...</span>
            </div>
          ) : relatedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <div 
                  key={relatedProduct.product_id} 
                  className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition cursor-pointer hover:scale-105 transform duration-200"
                  onClick={(e) => handleRelatedProductClick(relatedProduct.product_id, e)}
                >
                    <div className="relative h-48 w-full bg-white">
                      <Image
                        src={getValidImageSrc(relatedProduct.image_1)}
                        alt={relatedProduct.name}
                        fill
                        className="object-cover"
                        onError={handleImageError}
                        unoptimized={!!(relatedProduct.image_1 && relatedProduct.image_1.startsWith('https://'))}
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-1 text-gray-600">{relatedProduct.name}</h3>
                       <p className="text-sm text-black mb-2">{relatedProduct.brand_name}</p>
                      <p className="text-lg font-bold text-black">{formatPrice(relatedProduct.sale_price)}</p>
                    </div>
                  </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No related products found in this category.</p>
              <p className="text-sm text-gray-500 mt-2">Try browsing other categories for similar products.</p>
            </div>
          )}
        </div>

        {/* Customer Reviews */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-black mb-8">Customer Reviews</h2>
          <div className="space-y-6">
            {customerReviews.map((review) => (
              <div key={review.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-black font-medium">{review.user_name.charAt(0)}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-black">{review.user_name}</h4>
                      <div className="flex items-center space-x-1">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-black">
                    {formatDate(review.date)}
                  </div>
                </div>
                <p className="text-black">{review.comment}</p>
                {review.verified && (
                  <div className="mt-3 flex items-center text-sm text-green-600">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified Purchase
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage; 