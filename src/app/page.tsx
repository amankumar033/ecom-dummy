"use client";
import dynamic from 'next/dynamic';
import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Lazy load components for better initial page load performance
const Categories = dynamic(() => import("@/components/Categories"), {
  loading: () => <div className="h-48 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D27208]"></div></div>
});
const Advertisement = dynamic(() => import("@/components/Advertisement"), {
  loading: () => <div className="h-32 bg-gray-100 animate-pulse rounded-lg"></div>
});
const Products = dynamic(() => import("@/components/Products"), {
  loading: () => <div className="container mx-auto px-4 py-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>
});
const Poster = dynamic(() => import("@/components/Poster"), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse"></div>
});
const Deals = dynamic(() => import("@/components/Deals"), {
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg"></div>
});

export default function HomePage() {
  const router = useRouter();

  // Prefetch API routes immediately on page load for faster loading
  useEffect(() => {
    // Prefetch categories and products API routes in parallel
    const prefetchData = async () => {
      // Use Promise.allSettled to fetch both in parallel without blocking
      Promise.allSettled([
        fetch('/api/categories', { method: 'HEAD' }).catch(() => {}),
        fetch('/api/products/featured', { method: 'HEAD' }).catch(() => {})
      ]);
    };
    
    prefetchData();
    
    // Also prefetch the shop page route
    router.prefetch?.('/shop');
  }, [router]);

  return (
    <div>
      <main className="pt-0">
        <Suspense fallback={<div className="h-48 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D27208]"></div></div>}>
          <Categories />
        </Suspense>
        <Suspense fallback={<div className="h-32 bg-gray-100 animate-pulse rounded-lg"></div>}>
          <Advertisement />
        </Suspense>
        <Suspense fallback={<div className="container mx-auto px-4 py-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>}>
          <Products />
        </Suspense>
        <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse"></div>}>
          <Poster />
        </Suspense>
        <Suspense fallback={<div className="h-96 bg-gray-100 animate-pulse rounded-lg"></div>}>
          <Deals />
        </Suspense>
      </main>
    </div>
  );
}