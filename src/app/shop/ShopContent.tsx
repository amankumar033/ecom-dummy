'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getValidImageSrc, handleImageError } from '@/utils/imageUtils';
import { formatPrice } from '@/utils/priceUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

type Category = {
  category_id: string;
  name: string;
  slug: string;
  description: string;
  is_active: number;
  is_featured: number;
  created_at: string;
  updated_at: string;
  dealer_id: string;
};

type SubCategory = {
  sub_category_id: string;
  name: string;
  slug: string;
  category_id: string;
  created_at: string;
  updated_at: string;
};

type Product = {
  product_id: string;
  name: string;
  slug: string;
  sale_price: string;
  original_price: string;
  rating: string;
  image_1: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
  category_name: string;
  category_slug: string;
  subcategory_slug?: string;
  sub_brand_name?: string;
    brand_name: string;
  stock_quantity: string;
  is_active: string;
  is_featured: string;
  is_hot_deal: string;
};
interface Brand {
  brand_id: string;
  brand_name: string;
}
export default function ShopContent() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart, cartItems, loadingItems } = useCart();
  const [startIndex] = useState(0);
  const visibleItems = 5;
  const [activeFilter] = useState<number | null>(null);
  
  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategoriesByCategory, setSubcategoriesByCategory] = useState<Record<string, SubCategory[]>>({});
  const [loadingSubcategories] = useState<Record<string, boolean>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const productsRef = useRef<Product[]>([]);
  // Stable baseline of ALL featured products for counts and filter lists (not affected by current filters)
  const allFeaturedProductsRef = useRef<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openListCategoryId] = useState<string | null>(null);
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Brand and sub-brand states
  const [brands, setBrands] = useState<Array<{brand_id: string, brand_name: string}>>([]);
  const [subBrands, setSubBrands] = useState<Array<{sub_brand_id: string, sub_brand_name: string, brand_id: string, brand_name: string}>>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingSubBrands, setLoadingSubBrands] = useState(false);
  
  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSubBrands, setSelectedSubBrands] = useState<string[]>([]);
  const [selectedConditions] = useState<string[]>([]);
  const [selectedMaterials] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [subBrandSearch, setSubBrandSearch] = useState('');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filtersInitialized] = useState(false);
  const fetchCounterRef = useRef(0);

  // Brands accordion states (keeping for compatibility)
  const [brandsFromApi] = useState<string[]>([]);
  const [subBrandsByBrand, setSubBrandsByBrand] = useState<Record<string, { sub_brand_name: string; brand_name: string }[]>>({});
  const [loadingSubBrandsByBrand] = useState<Record<string, boolean>>({});

  // Product status helper
  const getProductStatus = (product: Product) => {
    const isInCart = cartItems.some(item => item.product_id === product.product_id);
    const cartQuantity = cartItems.find(item => item.product_id === product.product_id)?.quantity || 0;
    const availableStock = Math.max(0, parseInt(product.stock_quantity) - cartQuantity);
    
    if (product.is_active !== "1") {
      return { status: 'unavailable', text: 'Unavailable', bgColor: 'bg-gray-400', color: 'text-white' };
    }
    
    if (availableStock <= 0) {
      return { status: 'out-of-stock', text: 'Out of Stock', bgColor: 'bg-red-500', color: 'text-white' };
    }
    
    if (isInCart) {
      return { status: 'in-cart', text: 'In Cart', bgColor: 'bg-green-500', color: 'text-white' };
    }
    
    return { status: 'available', text: 'Add to Cart', bgColor: 'bg-blue-600', color: 'text-white' };
  };

  const handleAddToCart = async (productId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    
    const product = products.find(p => p.product_id === productId);
    if (!product) return;
    
    try {
      await addToCart({
        product_id: product.product_id,
        name: product.name,
        price: parseFloat(product.sale_price),
        image: product.image_1,
        stock_quantity: parseInt(product.stock_quantity) || 0,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch all products for filter counts (not just featured)
  const fetchAllFeaturedProducts = async () => {
    try {
      const response = await fetch('/api/products/all');
      const data = await response.json();
      if (data.success && data.products) {
        allFeaturedProductsRef.current = data.products;
      }
    } catch (error) {
      console.error('Error fetching all products for filters:', error);
    }
  };

  // Fetch brands directly from brands table
  const fetchBrands = async () => {
    try {
      setLoadingBrands(true);
      console.log('🔄 Fetching brands...');
      const response = await fetch('/api/brands');
      const data = await response.json();
      console.log('📦 Brands API response:', data);
      
      if (data.success && data.brands && Array.isArray(data.brands)) {
        // Filter out any invalid brands
        const validBrands = data.brands.filter((brand: Brand) => 
          brand && 
          brand.brand_id && 
          brand.brand_name && 
          typeof brand.brand_name === 'string' && 
          brand.brand_name.trim() !== ''
        );
        
        console.log(`✅ Setting ${validBrands.length} valid brands:`, validBrands.map((b: Brand) => b.brand_name));
        console.log('🎯 Valid brands objects:', validBrands);
        
        // Ensure we're setting the correct data structure
        setBrands(validBrands);
        
        // Verify the state was set correctly
        setTimeout(() => {
          console.log('🔍 Brands state after setting:', brands);
        }, 100);
        
      } else {
        console.error('❌ Brands API failed or returned invalid data:', data);
        setBrands([]);
      }
    } catch (error) {
      console.error('❌ Error fetching brands:', error);
      setBrands([]);
    } finally {
      setLoadingBrands(false);
    }
  };

  // Fetch sub-brands directly from sub_brands table
  const fetchSubBrands = async () => {
    try {
      setLoadingSubBrands(true);
      console.log('🔄 Fetching sub-brands...');
      const response = await fetch('/api/sub-brands');
      const data = await response.json();
      console.log('📦 Sub-brands API response:', data);
      if (data.success && data.subBrands) {
        console.log(`✅ Setting ${data.subBrands.length} sub-brands`);
        setSubBrands(data.subBrands);
      } else {
        console.error('❌ Sub-brands API failed:', data);
      }
    } catch (error) {
      console.error('❌ Error fetching sub-brands:', error);
    } finally {
      setLoadingSubBrands(false);
    }
  };

  // Fetch subcategories for a category
  // const fetchSubcategories = async (categoryId: string) => {
  //   if (subcategoriesByCategory[categoryId]) return;
    
  //   setLoadingSubcategories(prev => ({ ...prev, [categoryId]: true }));
  //   try {
  //     const response = await fetch(`/api/subcategories?category_id=${categoryId}`);
  //     const data = await response.json();
  //     if (data.success) {
  //       setSubcategoriesByCategory(prev => ({ ...prev, [categoryId]: data.subcategories }));
  //   }
  //   } catch (error) {
  //     console.error('Error fetching subcategories:', error);
  //   } finally {
  //     setLoadingSubcategories(prev => ({ ...prev, [categoryId]: false }));
  //   }
  // };

  // Fetch products with filters
  const fetchProducts = async () => {
    const currentFetch = ++fetchCounterRef.current;
    
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (selectedCategories.length > 0) {
        params.set('categories', selectedCategories.join(','));
      }
      if (selectedSubcategories.length > 0) {
        params.set('subcategories', selectedSubcategories.join(','));
      }
      if (selectedBrands.length > 0) {
        params.set('brands', selectedBrands.join(','));
      }
      if (selectedSubBrands.length > 0) {
        params.set('subbrands', selectedSubBrands.join(','));
      }
      if (priceRange[0] > 0) {
        params.set('minPrice', priceRange[0].toString());
      }
      if (priceRange[1] < 1000) {
        params.set('maxPrice', priceRange[1].toString());
      }
      if (selectedRatings.length > 0) {
        params.set('ratings', selectedRatings.join(','));
      }
      if (inStockOnly) {
        params.set('inStockOnly', '1');
      }
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      
      const queryString = params.toString();
      const url = `/api/products/all${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      // Only update if this is still the latest fetch
      if (currentFetch === fetchCounterRef.current) {
        if (data.success && data.products) {
          setProducts(data.products);
          productsRef.current = data.products;
        } else {
          setError(data.message || 'Failed to fetch products');
        }
      }
    } catch (error) {
      if (currentFetch === fetchCounterRef.current) {
        console.error('Error fetching products:', error);
        setError('Failed to fetch products');
      }
    } finally {
      if (currentFetch === fetchCounterRef.current) {
        setLoading(false);
      }
    }
  };

  // Fetch sub-brands for a brand
  // const fetchSubBrands = async (brandName: string) => {
  //   if (subBrandsByBrand[brandName]) return;
    
  //   setLoadingSubBrands(prev => ({ ...prev, [brandName]: true }));
  //   try {
  //     const response = await fetch(`/api/subbrands?brand_name=${encodeURIComponent(brandName)}`);
  //     const data = await response.json();
  //     if (data.success) {
  //       setSubBrandsByBrand(prev => ({ ...prev, [brandName]: data.subbrands }));
  //     }
  //   } catch (error) {
  //     console.error('Error fetching sub-brands:', error);
  //   } finally {
  //     setLoadingSubBrands(prev => ({ ...prev, [brandName]: false }));
  //   }
  // };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      console.log('🚀 Initializing shop data...');
      const runNext = async () => {
        try {
          console.log('📡 Fetching all data in parallel...');
          await Promise.all([
            fetchCategories(),
            fetchBrands(),
            fetchSubBrands(),
            fetchAllFeaturedProducts()
          ]);
          console.log('✅ All data fetched, now fetching products...');
          await fetchProducts();
          console.log('✅ Shop initialization complete!');
        } catch (error) {
          console.error('❌ Error initializing data:', error);
        }
      };
      
      runNext();
    };
    
    initializeData();
  }, []);

  // Initialize filters from URL
  useEffect(() => {
    if (!searchParams) return;
    
    const category = searchParams.get('category');
    const subcategories = searchParams.get('subcategories');
    const brands = searchParams.get('brands');
    const subbrands = searchParams.get('subbrands');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const ratings = searchParams.get('ratings');
    const inStockOnlyParam = searchParams.get('inStockOnly');
    const search = searchParams.get('search');
    
    if (category) setSelectedCategories([category]);
    if (subcategories) setSelectedSubcategories(subcategories.split(','));
    if (brands) setSelectedBrands(brands.split(','));
    if (subbrands) setSelectedSubBrands(subbrands.split(','));
    if (minPrice || maxPrice) {
      setPriceRange([
        minPrice ? parseInt(minPrice) : 0,
        maxPrice ? parseInt(maxPrice) : 1000
      ]);
    }
    if (ratings) setSelectedRatings(ratings.split(',').map(r => parseInt(r)));
    if (inStockOnlyParam) setInStockOnly(inStockOnlyParam === '1');
    if (search) setSearchQuery(search);
    
    // setFiltersInitialized(true);
  }, [searchParams]);

  // Listen for cart updates
  useEffect(() => {
    const handleCartUpdate = () => {
      // Refresh products to update stock quantities
      fetchProducts();
    };

    window.addEventListener('cartUpdated', handleCartUpdate as EventListener);
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate as EventListener);
    };
  }, []);

  // Monitor brands state changes
  useEffect(() => {
    console.log('🔄 Brands state changed:', {
      length: brands.length,
      brands: brands,
      sample: brands.slice(0, 3)
    });
  }, [brands]);

  // Fetch products when filters change
  useEffect(() => {
    // Only fetch if we have categories loaded (to avoid initial fetch)
    if (categories.length > 0) {
      fetchProducts();
    }
  }, [selectedCategories, selectedSubcategories, selectedBrands, selectedSubBrands, selectedRatings, priceRange, inStockOnly, searchQuery]);

  // Carousel navigation
  // const nextSlide = () => {
  //   setStartIndex(prev => 
  //     prev + 1 > categories.length - visibleItems ? 0 : prev + 1
  //   );
  // };

  // const prevSlide = () => {
  //   setStartIndex(prev => 
  //     prev - 1 < 0 ? categories.length - visibleItems : prev - 1
  //   );
  // };

  // Filter helpers
  const toggleFilterOption = (value: string, selected: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) => {
    setSelected(prev => 
      prev.includes(value) 
        ? prev.filter(item => item !== value)
        : [...prev, value]
    );
  };

  const toggleRating = (rating: number) => {
    setSelectedRatings(prev => 
      prev.includes(rating) 
        ? prev.filter(r => r !== rating)
        : [...prev, rating]
    );
  };

  // Filter products based on current filters
  const filteredProducts = products.filter(product => {
    // Category filter
    if (selectedCategories.length > 0 && !selectedCategories.includes(product.category_name)) {
      return false;
    }
    
    // Subcategory filter
    if (selectedSubcategories.length > 0 && product.subcategory_slug && !selectedSubcategories.includes(product.subcategory_slug)) {
      return false;
    }
    
    // Brand filter
    if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand_name)) {
      return false;
    }
    
    // Sub-brand filter
    if (selectedSubBrands.length > 0 && product.sub_brand_name && !selectedSubBrands.includes(product.sub_brand_name)) {
      return false;
    }
    
    // Price filter
    const price = parseFloat(product.sale_price);
    if (price < priceRange[0] || price > priceRange[1]) {
      return false;
    }
    
    // Rating filter
    if (selectedRatings.length > 0 && !selectedRatings.includes(Math.floor(parseFloat(product.rating)))) {
      return false;
    }
    
    // Stock filter
    if (inStockOnly && parseInt(product.stock_quantity) <= 0) {
      return false;
    }
    
    // Search filter
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !product.brand_name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Extract unique values for filters from products
  const filterCategories = [...new Set(allFeaturedProductsRef.current.map(p => p.category_name))];
  
  // Use brands fetched directly from brands table
  const filteredBrands = brands
    .filter(brand => brand && brand.brand_name) // Ensure brand exists and has name
    .map(brand => brand.brand_name)
    .filter(brandName => 
      brandName && brandName.toLowerCase().includes(brandSearch.toLowerCase())
    );
  
  // Fallback brands if API fails (for debugging)
  const fallbackBrands = ['Artify', 'Asian Paints', 'CanvasPro', 'Chumbak', 'Corrito', 'FabIndia', 'Home Centre', 'Pepperfry', 'PosterGully', 'Urban Ladder', 'WallMantra'];
  // Use API brands if available, otherwise fallback
  const testBrands = brands.length > 0 ? brands.map(b => b.brand_name).filter(Boolean) : fallbackBrands;
  
  // Force use fallback brands for now to test rendering
  const displayBrands = fallbackBrands;
  
  // Debug brands processing
  console.log('🔍 Brands processing debug:', {
    originalBrands: brands,
    filteredBrands: filteredBrands,
    testBrands: testBrands,
    fallbackBrands: fallbackBrands
  });
  
  // Debug logging
  console.log('🔍 Filter debug:', {
    totalBrands: brands.length,
    brandSearch: brandSearch,
    filteredBrands: filteredBrands,
    selectedBrands: selectedBrands,
    testBrands: testBrands,
    testBrandsLength: testBrands.length
  });
  
  // Force log brands state
  console.log('🎯 Brands state:', brands);
  console.log('🎯 Test brands:', testBrands);
  const ratings = [1, 2, 3, 4, 5];

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Shop</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Shop</h1>
              <p className="text-gray-600 mt-1">Find the best automotive products</p>
            </div>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-md ml-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Filters Display */}
        {(selectedCategories.length > 0 || selectedSubcategories.length > 0 || selectedBrands.length > 0 || selectedSubBrands.length > 0 || selectedRatings.length > 0 || priceRange[0] > 0 || priceRange[1] < 1000 || inStockOnly || searchQuery) && (
          <div className="mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Active Filters:</span>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Category Filters */}
                {selectedCategories.map(category => (
                  <span key={category} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    Category: {category}
                    <button 
                      onClick={() => toggleFilterOption(category, selectedCategories, setSelectedCategories)} 
                      className="ml-1 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
                
                {/* Subcategory Filters */}
                {selectedSubcategories.map(subcategory => (
                  <span key={subcategory} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    Subcategory: {subcategory}
                    <button 
                      onClick={() => toggleFilterOption(subcategory, selectedSubcategories, setSelectedSubcategories)} 
                      className="ml-1 hover:text-green-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
                
                {/* Brand Filters */}
                {selectedBrands.map(brand => (
                  <span key={brand} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                    Brand: {brand}
                    <button 
                      onClick={() => toggleFilterOption(brand, selectedBrands, setSelectedBrands)} 
                      className="ml-1 hover:text-purple-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
                
                {/* Sub-brand Filters */}
                {selectedSubBrands.map(subBrand => (
                  <span key={subBrand} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded">
                    Sub-brand: {subBrand}
                    <button 
                      onClick={() => toggleFilterOption(subBrand, selectedSubBrands, setSelectedSubBrands)} 
                      className="ml-1 hover:text-indigo-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
                
                {/* Rating Filters */}
                {selectedRatings.map(rating => (
                  <span key={rating} className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                    Rating: {rating}★ & up
                    <button 
                      onClick={() => toggleRating(rating)} 
                      className="ml-1 hover:text-yellow-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
                
                {/* Price Range Filter */}
                {(priceRange[0] > 0 || priceRange[1] < 1000) && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                    Price: ₹{priceRange[0]} - ₹{priceRange[1]}
                    <button 
                      onClick={() => setPriceRange([0, 1000])} 
                      className="ml-1 hover:text-orange-600"
                    >
                      ×
                    </button>
                  </span>
                )}
                
                {/* In Stock Only Filter */}
                {inStockOnly && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                    In Stock Only
                    <button 
                      onClick={() => setInStockOnly(false)} 
                      className="ml-1 hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                )}
                
                {/* Search Query Filter */}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                    Search: "{searchQuery}"
                    <button 
                      onClick={() => setSearchQuery('')} 
                      className="ml-1 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </span>
                )}
                
                {/* Clear All Filters Button */}
                <button
                  onClick={() => {
                    setSelectedCategories([]);
                    setSelectedSubcategories([]);
                    setSelectedBrands([]);
                    setSelectedSubBrands([]);
                    setSelectedRatings([]);
                    setPriceRange([0, 1000]);
                    setInStockOnly(false);
                    setSearchQuery('');
                    setBrandSearch('');
                  }}
                  className="text-xs text-gray-600 hover:text-gray-800 underline"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
              
              {/* Categories */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Categories</h3>
                <div className="space-y-2">
                  {filterCategories.map(category => (
                    <label key={category} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleFilterOption(category, selectedCategories, setSelectedCategories)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Brands */}
              <div className="mb-6 border-4 border-red-500 bg-yellow-200 p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Brands ({displayBrands.length})</h3>
                {/* Debug info */}
                <div className="text-xs text-gray-500 mb-2">
                  Debug: {displayBrands.length} display brands, {brands.length} API brands
                </div>
                <input
                  type="text"
                  placeholder="Search brands..."
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3"
                />
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  <div className="text-xs text-red-500 mb-2">🔍 BRANDS SECTION RENDERED</div>
                  <div className="text-xs text-blue-500 mb-2">Display brands count: {displayBrands.length}</div>
                  <div className="text-xs text-green-500 mb-2">Display brands: {displayBrands.join(', ')}</div>
                  {loadingBrands ? (
                    <div className="text-sm text-gray-500">Loading brands...</div>
                  ) : displayBrands.length > 0 ? (
                    displayBrands.map(brand => (
                      <label key={brand} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brand)}
                          onChange={() => toggleFilterOption(brand, selectedBrands, setSelectedBrands)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{brand}</span>
                      </label>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">No brands found</div>
                  )}
                </div>
              </div>

              {/* Sub-Brands */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Sub-Brands</h3>
                <input
                  type="text"
                  placeholder="Search sub-brands..."
                  value={subBrandSearch}
                  onChange={(e) => setSubBrandSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3"
                />
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {loadingSubBrands ? (
                    <div className="text-sm text-gray-500">Loading sub-brands...</div>
                  ) : (
                    subBrands
                      .filter(subBrand => 
                        subBrand.sub_brand_name.toLowerCase().includes(subBrandSearch.toLowerCase())
                      )
                      .map(subBrand => (
                        <label key={subBrand.sub_brand_id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedSubBrands.includes(subBrand.sub_brand_name)}
                            onChange={() => toggleFilterOption(subBrand.sub_brand_name, selectedSubBrands, setSelectedSubBrands)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {subBrand.sub_brand_name} <span className="text-gray-500">({subBrand.brand_name})</span>
                          </span>
                        </label>
                      ))
                  )}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Price Range</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>₹{priceRange[0]}</span>
                    <span>₹{priceRange[1]}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Ratings */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Rating</h3>
                <div className="space-y-2">
                  {ratings.map(rating => (
                    <label key={rating} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedRatings.includes(rating)}
                        onChange={() => toggleRating(rating)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {rating}★ & up
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Stock Filter */}
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">In Stock Only</span>
                </label>
              </div>

              {/* Clear Filters */}
                              <button
                  onClick={() => {
                    setSelectedCategories([]);
                    setSelectedSubcategories([]);
                    setSelectedBrands([]);
                    setSelectedSubBrands([]);
                    setSelectedRatings([]);
                    setPriceRange([0, 1000]);
                    setInStockOnly(false);
                    setSearchQuery('');
                    setBrandSearch('');
                    setSubBrandSearch('');
                  }}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 text-sm"
                >
                  Clear All Filters
                </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:w-3/4">
            {/* Results Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {loading ? 'Loading...' : `${filteredProducts.length} Products`}
                </h2>
                {selectedCategories.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    Filtered by: {selectedCategories.join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow overflow-hidden animate-pulse">
                    <div className="h-40 bg-gray-200"></div>
                    <div className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Products Grid */}
            {!loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredProducts.map(product => (
                  <div key={product.product_id} className="bg-white rounded-lg shadow overflow-hidden flex flex-col h-full">
                    {/* Product Image and Name as Link */}
                    <Link href={`/products/${product.slug}`} className="flex flex-col flex-grow" onClick={() => console.log('Product clicked:', product.slug)}>
                      <div className="relative h-40 sm:h-48 w-full">
                        <Image
                          src={getValidImageSrc(product.image_1)}
                          alt={product.name}
                          fill
                          className="object-cover"
                          onError={handleImageError}
                          unoptimized={!!(product.image_1 && product.image_1.startsWith('https://'))}
                        />
                        {/* Hot Deal Badge */}
                        {product.is_hot_deal === "1" && (
                          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                            HOT DEAL
                          </div>
                        )}
                      </div>
                      <div className="p-3 sm:p-4 flex flex-col flex-grow">
                        <h3 className="font-semibold text-base sm:text-lg mb-1 line-clamp-2">{product.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-500 mb-1 line-clamp-1">{product.brand_name} • {product.category_name} • {product.stock_quantity} in stock</p>
                        {/* Rating */}
                        <div className="flex items-center mb-2">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-3 h-3 sm:w-4 sm:h-4 ${i < Math.floor(Number(product.rating) || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                          <span className="text-xs text-gray-500 ml-1">({Number(product.rating || 0).toFixed(1)})</span>
                        </div>
                        {/* Price */}
                        <div className="mb-3">
                          <p className="text-base sm:text-lg font-bold text-gray-800">{formatPrice(product.sale_price)}</p>
                        </div>
                      </div>
                    </Link>
                    {/* Add to Cart Button (outside Link) */}
                    <div className="p-3 sm:p-4 pt-0 mt-auto">
                      {(() => {
                        const isLoading = loadingItems.has(product.product_id);
                        const status = getProductStatus(product);
                        if (status.status === 'unavailable') {
                          return (
                            <button disabled className={`w-full py-2 rounded-md text-sm sm:text-base flex items-center justify-center ${status.bgColor} ${status.color}`}>
                              {status.text}
                            </button>
                          );
                        }
                        if (status.status === 'out-of-stock') {
                          return (
                            <div className="w-full py-2 text-center text-red-600 font-medium">Out of Stock</div>
                          );
                        }
                        return (
                          <button
                            onClick={(e) => {
                              if (isLoading) return;
                              handleAddToCart(product.product_id.toString(), e)
                            }}
                            disabled={isLoading}
                            className={`w-full py-2 rounded-md text-sm sm:text-base flex items-center justify-center ${isLoading ? 'bg-blue-400 cursor-wait' : status.bgColor} ${status.color}`}
                          >
                            {isLoading ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Adding...
                              </span>
                            ) : (
                              status.text
                            )}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Products Found Message */}
            {!loading && filteredProducts.length === 0 && (
              <div className="text-center py-10">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">No products found</h3>
                <p className="text-gray-600 text-sm sm:text-base">Try adjusting your filters to find what you're looking for.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
