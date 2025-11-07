'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  stock_quantity?: number;
  product?: any;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getDiscountedPrice: () => number;
  applyCoupon: (code: string) => { success: boolean; message: string; discount: number };
  removeCoupon: () => void;
  couponCode: string | null;
  discountPercentage: number;
  loading: boolean;
  error: string | null;
  loadingItems: Set<string>; // Track which items are being added
  isCheckoutInProgress: boolean;
  checkout: (orderData: any) => Promise<{ success: boolean; message: string; order_id?: string; order_ids?: string[] }>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  // Hydrate immediately from localStorage (no flicker)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      // Prefer user cart if a user is present in local storage; otherwise fallback to guest cart
      const userDataRaw = localStorage.getItem('user_data');
      let cartKey = 'cart_guest';
      if (userDataRaw) {
        const parsedUser = JSON.parse(userDataRaw);
        const userId = parsedUser?.user_id;
        if (userId) {
          cartKey = `cart_${userId}`;
        }
      }
      const cartRaw = localStorage.getItem(cartKey);
      if (cartRaw) {
        const parsedCart = JSON.parse(cartRaw);
        if (Array.isArray(parsedCart)) return parsedCart;
      }
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const [isCheckoutInProgress, setIsCheckoutInProgress] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const checkoutRequestId = useRef<string | null>(null);
  
  const { user, isLoggedIn } = useAuth();
  const { showToast } = useToast();

  // Local storage helpers for persistence across reloads
  const getStorageKey = () => (user?.user_id ? `cart_${user.user_id}` : 'cart_guest');
  const getGuestStorageKey = () => 'cart_guest';
  const persistLocalCart = (items: CartItem[]) => {
    const key = getStorageKey();
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {}
  };
  const readLocalCart = (): CartItem[] | null => {
    const key = getStorageKey();
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };
  const readGuestCart = (): CartItem[] | null => {
    try {
      const raw = localStorage.getItem(getGuestStorageKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  // Load cart when user logs in
  useEffect(() => {
    if (isLoggedIn && user?.user_id) {
      // Migrate guest cart to user cart if present
      const guest = readGuestCart();
      if (guest && guest.length > 0) {
        // Validate stock before merging guest cart
        validateAndMergeGuestCart(guest);
      } else {
        // Hydrate from user local cart to avoid flicker
        const local = readLocalCart();
        if (local && local.length > 0) {
          setCartItems(local);
        }
      }
      loadCartFromDatabase();
    } else {
      // Logged out: hydrate from guest cart (persisted locally)
      const guest = readGuestCart();
      setCartItems(guest ?? []);
    }
  }, [isLoggedIn, user?.user_id]);

    // Validate stock and merge guest cart with user cart
  const validateAndMergeGuestCart = async (guestCart: CartItem[]) => {
    try {
      // Get existing user cart from database
      const response = await fetch(`/api/cart/get?userId=${encodeURIComponent(user!.user_id)}`);
      const data = await response.json();
      const dbCart: CartItem[] = data.success ? (Array.isArray(data.cartItems) ? data.cartItems : []) : [];
      
      // Create a map of existing items for easy lookup
      const existingItemsMap = new Map(dbCart.map(item => [item.product_id, item]));
      const guestItemsMap = new Map(guestCart.map(item => [item.product_id, item]));
      
      // Merge carts with stock validation
      const mergedCart: CartItem[] = [];
      const allProductIds = new Set([...existingItemsMap.keys(), ...guestItemsMap.keys()]);
      
      // Batch stock checks to reduce database connections
      const stockChecks = Array.from(allProductIds).map(async (productId) => {
        try {
          const stockResponse = await fetch(`/api/products/stock?product_id=${encodeURIComponent(productId)}`);
          const stockData = await stockResponse.json();
          return {
            productId,
            stock: stockData.success ? Number(stockData.stock_quantity) || 0 : 0,
            success: true
          };
        } catch {
          return {
            productId,
            stock: 0,
            success: false
          };
        }
      });
      
      // Wait for all stock checks to complete
      const stockResults = await Promise.allSettled(stockChecks);
      const stockMap = new Map();
      
      stockResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          stockMap.set(result.value.productId, result.value.stock);
        }
      });
      
      for (const productId of allProductIds) {
        const existingItem = existingItemsMap.get(productId);
        const guestItem = guestItemsMap.get(productId);
        const availableStock = stockMap.get(productId) || 0;
        
        if (existingItem && guestItem) {
          // Both carts have this item - merge quantities
          const totalQuantity = existingItem.quantity + guestItem.quantity;
          
          // Clamp to available stock, but ensure we add at least 1 if stock is available
          let finalQuantity = Math.min(totalQuantity, availableStock);
          
          // If stock is available but we're showing 0, add at least 1 up to available stock
          if (finalQuantity === 0 && availableStock > 0) {
            finalQuantity = Math.min(1, availableStock);
          }
          
          mergedCart.push({
            ...existingItem,
            quantity: finalQuantity,
            stock_quantity: availableStock
          });
          
          if (finalQuantity < totalQuantity && finalQuantity > 0) {
            showToast('warning', `${existingItem.name} quantity adjusted to available stock (${finalQuantity})`);
          } else if (finalQuantity === 0 && availableStock === 0) {
            showToast('warning', `${existingItem.name || 'Product'} is out of stock and removed from cart`);
          }
        } else if (existingItem) {
          // Only in user cart
          mergedCart.push(existingItem);
        } else if (guestItem) {
          // Only in guest cart - validate stock
          // Clamp to available stock, but ensure we add at least 1 if stock is available
          let finalQuantity = Math.min(guestItem.quantity, availableStock);
          
          // If stock is available but we're showing 0, add at least 1 up to available stock
          if (finalQuantity === 0 && availableStock > 0) {
            finalQuantity = Math.min(1, availableStock);
          }
          
          mergedCart.push({
            ...guestItem,
            quantity: finalQuantity,
            stock_quantity: availableStock
          });
          
          if (finalQuantity < guestItem.quantity && finalQuantity > 0) {
            showToast('warning', `${guestItem.name} quantity adjusted to available stock (${finalQuantity})`);
          } else if (finalQuantity === 0 && availableStock === 0) {
            showToast('warning', `${guestItem.name || 'Product'} is out of stock and removed from cart`);
          }
        }
      }
      
             // Filter out items with 0 quantity and update cart with merged items
       const finalCart = mergedCart.filter(item => item.quantity > 0);
       setCartItems(finalCart);
       persistLocalCart(finalCart);
       scheduleCartSync(finalCart);
      
      // Clean up guest cart
      try { localStorage.removeItem(getGuestStorageKey()); } catch {}
      
      showToast('success', 'Cart items merged successfully');
      
    } catch (error) {
      console.error('Error merging guest cart:', error);
      // Fallback: just use guest cart as is
      setCartItems(guestCart);
      persistLocalCart(guestCart);
      scheduleCartSync(guestCart);
      try { localStorage.removeItem(getGuestStorageKey()); } catch {}
    }
  };

  const loadCartFromDatabase = () => {
    if (!isLoggedIn || !user?.user_id) return;

    const localAtCallTime = readLocalCart();
    if (!localAtCallTime || localAtCallTime.length === 0) {
      setLoading(true);
    }

    const run = () => {
      fetch(`/api/cart/get?userId=${encodeURIComponent(user.user_id)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          const dbItems: CartItem[] = Array.isArray(data.cartItems) ? data.cartItems : [];
          const local = readLocalCart();
          if (dbItems.length > 0) {
            setCartItems(dbItems);
            persistLocalCart(dbItems);
          } else if (local && local.length > 0) {
            setCartItems(local);
            scheduleCartSync(local);
          } else {
            setCartItems([]);
            persistLocalCart([]);
          }
        } else {
          console.error('Failed to load cart:', data.message);
          // Fall back to local cart on API failure
          const local = readLocalCart();
          if (local && local.length > 0) {
            setCartItems(local);
          } else {
            setCartItems([]);
          }
        }
      })
      .catch(error => {
        console.error('Error loading cart:', error);
        // Fall back to local cart on network/database errors
        const local = readLocalCart();
        if (local && local.length > 0) {
          setCartItems(local);
        } else {
          setCartItems([]);
        }
      })
      .finally(() => {
        if (!localAtCallTime || localAtCallTime.length === 0) {
          setLoading(false);
        }
      });
    };

    // Run quickly without long idle delays
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(run, { timeout: 200 });
    } else {
      setTimeout(run, 0);
    }
  };

  // Debounced sync helpers
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCartItemsRef = useRef<CartItem[] | null>(null);

  const syncWithDatabase = async (cartItemsToSync: CartItem[]) => {
    if (!user?.user_id) return;
    try {
      const response = await fetch('/api/cart/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.user_id,
          cart_items: cartItemsToSync,
        }),
      });

      const data = await response.json();
      if (data?.success && Array.isArray(data.cartItems)) {
        // Only update if server data differs from local
        if (JSON.stringify(data.cartItems) !== JSON.stringify(cartItemsToSync)) {
          setCartItems(data.cartItems);
        }
      }
    } catch (err) {
      console.error('Database sync error:', err);
    }
  };

  const scheduleCartSync = (newCartItems: CartItem[]) => {
    pendingCartItemsRef.current = newCartItems;
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      if (pendingCartItemsRef.current) {
        syncWithDatabase(pendingCartItemsRef.current);
        pendingCartItemsRef.current = null;
      }
    }, 50); // Reduced from 100ms to 50ms for faster sync
  };

  // Ensure pending sync is flushed when page/tab is hidden or unloading
  useEffect(() => {
    const flushPending = () => {
      if (!user?.user_id) return;
      if (!pendingCartItemsRef.current) return;

      const payload = JSON.stringify({
        user_id: user.user_id,
        cart_items: pendingCartItemsRef.current,
      });

      // Try to use sendBeacon (POST). Server supports POST alias for update.
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/cart/update', blob);
      } catch {
        // Fallback to fetch keepalive
        try {
          fetch('/api/cart/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          });
        } catch {
          // Ignore
        }
      }

      pendingCartItemsRef.current = null;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPending();
      }
    };

    window.addEventListener('beforeunload', flushPending);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', flushPending);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user?.user_id]);

  const addToCart = async (item: Omit<CartItem, 'quantity'>): Promise<void> => {
    setError(null);
    
    // Set loading state for this specific item immediately
    setLoadingItems(prev => new Set(prev).add(item.product_id));
    
    // OPTIMISTIC UPDATE - Update UI immediately
    const existingItemIndex = cartItems.findIndex(cartItem => cartItem.product_id === item.product_id);
    let newCartItems: CartItem[];

    // Determine DB stock synchronously via last known check to clamp quantity
    const existingItem = existingItemIndex !== -1 ? cartItems[existingItemIndex] : null;
    // Default optimistic target quantity
    const targetQty = (existingItem?.quantity || 0) + 1;
    // Prefer known stock from item/cart if available
    let knownStock: number | null = null;
    if (existingItem && typeof existingItem.stock_quantity === 'number') {
      knownStock = existingItem.stock_quantity as number;
    }
    // Try quick stock fetch but cap to 120ms so UI doesn't feel slow
    let dbStock: number | null = knownStock;
    try {
      if (dbStock === null) {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 120);
        const resp = await fetch(`/api/products/stock?product_id=${encodeURIComponent(item.product_id)}`, { signal: controller.signal });
        clearTimeout(t);
        const data = await resp.json();
        if (data?.success) dbStock = Number(data.stock_quantity) || 0;
      }
    } catch {}

    const allowedQty = dbStock === null ? targetQty : Math.min(targetQty, Math.max(0, dbStock));

    if (existingItemIndex !== -1) {
      newCartItems = [...cartItems];
      newCartItems[existingItemIndex] = { 
        ...newCartItems[existingItemIndex], 
        quantity: allowedQty,
        // Persist most recent known stock if available
        stock_quantity: dbStock !== null ? dbStock : newCartItems[existingItemIndex].stock_quantity
      };
      if (allowedQty > existingItem!.quantity) {
        showToast('success', `${item.name || 'Product'} quantity updated in cart`);
      } else if (allowedQty <= existingItem!.quantity) {
        // Check if it's because we're already at max stock
        if (dbStock !== null && existingItem!.quantity >= dbStock) {
          showToast('warning', 'Reached available stock');
        } else {
          showToast('info', `${item.name || 'Product'} is already at maximum quantity in cart`);
        }
      }
    } else {
      const initialQty = Math.min(1, dbStock === null ? 1 : Math.max(0, dbStock));
      const itemStock = dbStock !== null ? dbStock : (item as any).stock_quantity;
      newCartItems = [...cartItems, { ...item, quantity: initialQty, stock_quantity: typeof itemStock === 'number' ? itemStock : undefined }];
      if (initialQty > 0) {
        showToast('success', `${item.name || 'Product'} added to cart`);
      } else {
        showToast('error', 'This product is out of stock');
      }
    }

    // Update UI immediately
    setCartItems(newCartItems);
    persistLocalCart(newCartItems);
    
    // Dispatch cart updated event immediately for real-time updates
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { cartItems: newCartItems } 
    }));

    // Debounced background sync (only if logged in)
    if (user?.user_id) {
      scheduleCartSync(newCartItems);
    }

    // Keep loading spinner briefly so the user sees feedback
    setTimeout(() => {
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.product_id);
        return newSet;
      });
    }, 100); // Reduced from 400ms to 100ms for faster response
  };

  // Fast stock verification on UI tick to prevent overs from DB; does not block adding
  useEffect(() => {
    if (cartItems.length === 0) return;
    // Debounced check to avoid spamming API
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const checks = cartItems.slice(0, 4).map(async (ci) => {
          // Check a few recent items only for speed; can be expanded
          const resp = await fetch(`/api/products/stock?product_id=${encodeURIComponent(ci.product_id)}`, { signal: controller.signal });
          const data = await resp.json();
          if (data?.success) {
            const dbStock: number = Number(data.stock_quantity) || 0;
            // If cart qty exceeds db stock, clamp it locally but don't clear the cart
            if (ci.quantity > dbStock && dbStock > 0) {
              setCartItems(prev => prev.map(p => p.product_id === ci.product_id ? { ...p, quantity: Math.max(1, dbStock) } : p));
              // Also persist
              const updated = cartItems.map(p => p.product_id === ci.product_id ? { ...p, quantity: Math.max(1, dbStock) } : p);
              persistLocalCart(updated);
              window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cartItems: updated } }));
              if (user?.user_id) scheduleCartSync(updated);
            }
          }
        });
        await Promise.race([
          Promise.allSettled(checks),
          new Promise(resolve => setTimeout(resolve, 100)), // hard cap to keep fast - reduced from 200ms
        ]);
      } catch {}
    }, 50); // Reduced from 150ms to 50ms for faster response
    return () => { clearTimeout(timer); controller.abort(); };
  }, [cartItems]);

  const updateQuantity = async (productId: string, quantity: number): Promise<void> => {
    setError(null);
    
    // Set loading state for this specific item
    setLoadingItems(prev => new Set(prev).add(productId));
    
    // OPTIMISTIC UPDATE - Update UI immediately
    let newCartItems: CartItem[];
    const item = cartItems.find(item => item.product_id === productId);
    const currentQty = item?.quantity || 0;
    // Clamp to stock quickly (prefer locally known stock)
    let dbStock: number | null = (typeof item?.stock_quantity === 'number') ? (item!.stock_quantity as number) : null;
    if (quantity > currentQty) {
      // Only increasing requires validation
      try {
        if (dbStock === null) {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 120);
          const resp = await fetch(`/api/products/stock?product_id=${encodeURIComponent(productId)}`, { signal: controller.signal });
          clearTimeout(t);
          const data = await resp.json();
          if (data?.success) dbStock = Number(data.stock_quantity) || 0;
        }
      } catch {}
      if (dbStock !== null) {
        quantity = Math.max(0, Math.min(quantity, dbStock));
      } else {
        // Unknown stock: do not allow increase beyond current
        quantity = currentQty;
      }
    }
    
    if (quantity > 0) {
      newCartItems = cartItems.map(ci =>
        ci.product_id === productId ? { ...ci, quantity, stock_quantity: (dbStock !== null ? dbStock : ci.stock_quantity) } : ci
      );
      if (quantity !== currentQty) {
        showToast('success', `${item?.name || 'Product'} quantity updated to ${quantity}`);
      }
    } else {
      // Remove item if quantity is 0 or less
      newCartItems = cartItems.filter(item => item.product_id !== productId);
      showToast('success', `${item?.name || 'Product'} removed from cart`);
    }

    // Update UI immediately
    setCartItems(newCartItems);
    persistLocalCart(newCartItems);
    
    // Dispatch cart updated event immediately
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { cartItems: newCartItems } 
    }));

    // Debounced background sync (only if logged in)
    if (user?.user_id) {
      scheduleCartSync(newCartItems);
    }

    // Keep loading spinner briefly
    setTimeout(() => {
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }, 400);
  };

  const removeFromCart = async (productId: string): Promise<void> => {
    setError(null);
    
    // Set loading state for this specific item
    setLoadingItems(prev => new Set(prev).add(productId));
    
    // OPTIMISTIC UPDATE - Update UI immediately
    const item = cartItems.find(item => item.product_id === productId);
    const newCartItems = cartItems.filter(item => item.product_id !== productId);

    // Update UI immediately
    setCartItems(newCartItems);
    persistLocalCart(newCartItems);
    
    // Dispatch cart updated event immediately
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { cartItems: newCartItems } 
    }));

    // Debounced background sync (only if logged in)
    if (user?.user_id) {
      scheduleCartSync(newCartItems);
    }

    // Show success message
    showToast('success', `${item?.name || 'Product'} removed from cart`);

    // Keep loading spinner briefly
    setTimeout(() => {
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }, 400);
  };

  const clearCart = () => {
    setError(null);
    setCartItems([]);
    persistLocalCart([]);
    
    // Dispatch cart updated event
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { cartItems: [] } 
    }));

    // Debounced background sync with empty cart (only if logged in)
    if (user?.user_id) {
      scheduleCartSync([]);
    }
    
    // Show success message
    showToast('success', 'Cart cleared successfully');
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getDiscountedPrice = () => {
    const total = getTotalPrice();
    const discount = (total * discountPercentage) / 100;
    return total - discount;
  };

  const applyCoupon = (code: string) => {
    const normalizedCode = code.trim().toLowerCase();
    
    if (normalizedCode === 'coupon10') {
      setCouponCode(code);
      setDiscountPercentage(10);
      showToast('success', 'Coupon applied! 10% discount');
      return { success: true, message: 'Coupon applied! 10% discount', discount: 10 };
    } else {
      showToast('error', 'Invalid coupon code');
      return { success: false, message: 'Invalid coupon code', discount: 0 };
    }
  };

  const removeCoupon = () => {
    setCouponCode(null);
    setDiscountPercentage(0);
    showToast('info', 'Coupon removed');
  };

  const checkout = async (orderData: any): Promise<{ success: boolean; message: string; order_id?: string; order_ids?: string[] }> => {
    if (isCheckoutInProgress) {
      return { success: false, message: 'Checkout already in progress. Please wait.' };
    }

    if (cartItems.length === 0) {
      return { success: false, message: 'Cart is empty' };
    }

    // Generate unique request ID to prevent duplicates
    const requestId = `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    checkoutRequestId.current = requestId;
    setIsCheckoutInProgress(true);
    setError(null);

    try {
      console.log('🔄 Starting checkout process...', { requestId, itemsCount: cartItems.length });

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItems,
          orderData,
          requestId // Include request ID for server-side deduplication
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Checkout successful:', data);
        
        // Clear cart only on successful checkout
        setCartItems([]);
        
        // Dispatch cart update event
        window.dispatchEvent(new CustomEvent('cartUpdated', {
          detail: { cartItems: [], action: 'checkout_completed' }
        }));

        return {
          success: true,
          message: data.message,
          order_id: data.order_id,
          order_ids: data.order_ids
        };
      } else {
        console.error('❌ Checkout failed:', data.message);
        setError(data.message);
        return {
          success: false,
          message: data.message
        };
      }
    } catch (error) {
      console.error('❌ Checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Checkout failed';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      // Only clear checkout state if this is still the current request
      if (checkoutRequestId.current === requestId) {
        setIsCheckoutInProgress(false);
        checkoutRequestId.current = null;
      }
    }
  };

  const value = {
    cartItems,
    loading,
    error,
    loadingItems,
    isCheckoutInProgress,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getDiscountedPrice,
    getTotalItems,
    applyCoupon,
    removeCoupon,
    couponCode,
    discountPercentage,
    checkout
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}; 