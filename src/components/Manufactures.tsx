'use client';

import { useRef, useEffect, useState } from 'react';

export default function Manufacturers() {
  // Balance the manufacturers into two equal rows
  const allManufacturers = [
    { id: 1, name: 'Mahindra & Mahindra', logo: '/brands/automotive/mahindra.png' },
    { id: 2, name: 'Toyota', logo: '/brands/automotive/toyota.png' },
    { id: 3, name: 'BMW', logo: '/brands/automotive/bmw.png' },
    { id: 4, name: 'Jaguar', logo: '/brands/automotive/jaguar.png' },
    { id: 5, name: 'Nissan', logo: '/brands/automotive/nissan.png' },
    { id: 6, name: 'Peugeot', logo: '/brands/automotive/peugeot.png' },
    { id: 7, name: 'Ford Mustang', logo: '/brands/automotive/ford.png' },
    { id: 8, name: 'Porsche', logo: '/brands/automotive/porsche.png' },
    { id: 9, name: 'Audi', logo: '/brands/automotive/audi.png' },
    { id: 10, name: 'TVS', logo: '/brands/automotive/tvs.png' },
    { id: 11, name: 'Robert Bosch GmbH', logo: '/brands/automotive/bosch.png' },
    { id: 12, name: 'Denso', logo: '/brands/automotive/denso.png' },
    { id: 13, name: 'Magna International', logo: '/brands/automotive/magna.png' },
    { id: 14, name: 'Continental AG', logo: '/brands/automotive/continental.png' },
    { id: 15, name: 'Mercedes-Benz', logo: '/brands/automotive/mercedes.png' },
    { id: 16, name: 'Renault', logo: '/brands/automotive/renault.png' },
    { id: 17, name: 'PSA', logo: '/brands/automotive/psa.png' },
    { id: 18, name: 'Suzuki', logo: '/brands/automotive/suzuki.png' },
    { id: 19, name: 'Mitsubishi', logo: '/brands/automotive/mitsubishi.png' },
    { id: 20, name: 'Tata', logo: '/brands/automotive/tata.png' },
    { id: 21, name: 'Daimler', logo: '/brands/automotive/daimler.png' },
  ];

  // Split into two balanced rows (11 in first row, 10 in second row)
  const manufacturers1 = allManufacturers.slice(0, 11);
  const manufacturers2 = allManufacturers.slice(11);

  const manufacturers1ContainerRef = useRef<HTMLDivElement>(null);
  const manufacturers2ContainerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const autoScrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scroll configuration
  const ITEM_WIDTH_PX = 116; // Manufacturer circle width
  const ITEM_GAP_PX = 16; // Gap between manufacturers
  const SCROLL_STEP_PX = ITEM_WIDTH_PX + ITEM_GAP_PX; // Scroll by one manufacturer width

  // Pause auto-scroll when user interacts
  const pauseAutoScroll = () => {
    setIsAutoScrolling(false);
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }
  };

  // Resume auto-scroll when cursor leaves
  const resumeAutoScroll = () => {
    setIsAutoScrolling(true);
  };

  // Resume auto-scroll after a delay (for mobile clicks)
  const resumeAutoScrollDelayed = () => {
    setTimeout(() => {
      setIsAutoScrolling(true);
    }, 1000); // Resume after 1 second
  };

  // Manual navigation with proper scrolling
  const scrollLeft = () => {
    pauseAutoScroll();
    const container1 = manufacturers1ContainerRef.current;
    const container2 = manufacturers2ContainerRef.current;
    if (!container1 || !container2) return;
    
    const currentScroll1 = container1.scrollLeft;
    const currentScroll2 = container2.scrollLeft;
    const singleSetWidth1 = manufacturers1.length * SCROLL_STEP_PX;
    const singleSetWidth2 = manufacturers2.length * SCROLL_STEP_PX;
    
    // Scroll first row
    if (currentScroll1 <= SCROLL_STEP_PX) {
      container1.scrollTo({ left: singleSetWidth1, behavior: 'smooth' });
    } else {
      container1.scrollBy({ left: -SCROLL_STEP_PX, behavior: 'smooth' });
    }
    
    // Scroll second row
    if (currentScroll2 <= SCROLL_STEP_PX) {
      container2.scrollTo({ left: singleSetWidth2, behavior: 'smooth' });
    } else {
      container2.scrollBy({ left: -SCROLL_STEP_PX, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    pauseAutoScroll();
    const container1 = manufacturers1ContainerRef.current;
    const container2 = manufacturers2ContainerRef.current;
    if (!container1 || !container2) return;
    
    const currentScroll1 = container1.scrollLeft;
    const currentScroll2 = container2.scrollLeft;
    const singleSetWidth1 = manufacturers1.length * SCROLL_STEP_PX;
    const singleSetWidth2 = manufacturers2.length * SCROLL_STEP_PX;
    
    // Scroll first row
    if (currentScroll1 >= singleSetWidth1 - SCROLL_STEP_PX) {
      container1.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      container1.scrollBy({ left: SCROLL_STEP_PX, behavior: 'smooth' });
    }
    
    // Scroll second row
    if (currentScroll2 >= singleSetWidth2 - SCROLL_STEP_PX) {
      container2.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      container2.scrollBy({ left: SCROLL_STEP_PX, behavior: 'smooth' });
    }
  };

  const handleBrandClick = (manufacturerName: string) => {
    // Pause auto-scroll and resume after delay
    pauseAutoScroll();
    resumeAutoScrollDelayed();
    
    // Set a timeout to detect slow navigation
    const slowNavigationTimeout = setTimeout(() => {
      console.log(`🐌 Slow navigation detected for manufacturers`);
      document.dispatchEvent(new CustomEvent('navigationStart'));
    }, 300);
    
    // Navigate to shop page with manufacturer filter
    window.location.href = `/shop?manufacturers=${encodeURIComponent(manufacturerName)}`;
    
    // Clear timeout if navigation was fast
    setTimeout(() => {
      clearTimeout(slowNavigationTimeout);
    }, 500);
  };

  // Auto-scroll functionality
  useEffect(() => {
    if (isAutoScrolling) {
      autoScrollInterval.current = setInterval(() => {
        const container1 = manufacturers1ContainerRef.current;
        const container2 = manufacturers2ContainerRef.current;
        if (!container1 || !container2) return;
        
        const currentScroll1 = container1.scrollLeft;
        const currentScroll2 = container2.scrollLeft;
        const singleSetWidth1 = manufacturers1.length * SCROLL_STEP_PX;
        const singleSetWidth2 = manufacturers2.length * SCROLL_STEP_PX;
        
        // Auto-scroll first row
        if (currentScroll1 >= singleSetWidth1 - SCROLL_STEP_PX) {
          container1.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          container1.scrollBy({ left: SCROLL_STEP_PX, behavior: 'smooth' });
        }
        
        // Auto-scroll second row
        if (currentScroll2 >= singleSetWidth2 - SCROLL_STEP_PX) {
          container2.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          container2.scrollBy({ left: SCROLL_STEP_PX, behavior: 'smooth' });
        }
      }, 3000); // Scroll every 3 seconds
    }

    return () => {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
      }
    };
  }, [isAutoScrolling, manufacturers1.length, manufacturers2.length]);

  return (
    <div className="container mx-auto pt-20 bg-white text-black px-1 sm:px-20 px-5 pb-10">
      {/* Header with arrows */}
      <div className="flex justify-between items-center mb-8 mt-9 sm:mt-0">
        <h2 className="text-3xl font-bold">Featured Manufacturers</h2>
        <div className="flex space-x-4">
          <button 
            onClick={scrollLeft}
            className="p-2 rounded-full hover:bg-gray-300 transition touch-manipulation select-none"
            style={{ touchAction: 'manipulation' }}
            aria-label="Previous"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            onClick={scrollRight}
            className="p-2 rounded-full hover:bg-gray-300 transition touch-manipulation select-none"
            style={{ touchAction: 'manipulation' }}
            aria-label="Next"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        {/* First Row */}
        <div 
          ref={manufacturers1ContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide"
          onMouseEnter={pauseAutoScroll}
          onMouseLeave={resumeAutoScroll}
          onTouchStart={pauseAutoScroll}
          onTouchEnd={resumeAutoScrollDelayed}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* First set of manufacturers for infinite scroll */}
          {manufacturers1.map((brand) => (
            <div key={`first-${brand.id}`} className="flex-shrink-0 cursor-pointer" onClick={() => handleBrandClick(brand.name)}>
              <div className="flex flex-col items-center">
                <div className="w-[116px] h-[116px] rounded-full border-2 border-gray-200 p-2 flex items-center justify-center shadow-md hover:shadow-lg transition-all hover:border-2 hover:border-[#f29f05] bg-white overflow-hidden">
                  <img 
                    src={brand.logo} 
                    alt={brand.name} 
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-sm text-center mt-2 font-medium text-gray-700">{brand.name}</p>
              </div>
            </div>
          ))}
          
          {/* Second set of manufacturers for infinite scroll */}
          {manufacturers1.map((brand) => (
            <div key={`second-${brand.id}`} className="flex-shrink-0 cursor-pointer" onClick={() => handleBrandClick(brand.name)}>
              <div className="flex flex-col items-center">
                <div className="w-[116px] h-[116px] rounded-full border-2 border-gray-200 p-2 flex items-center justify-center shadow-md hover:shadow-lg transition-all hover:border-2 hover:border-[#f29f05] bg-white overflow-hidden">
                  <img 
                    src={brand.logo} 
                    alt={brand.name} 
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-sm text-center mt-2 font-medium text-gray-700">{brand.name}</p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Second Row */}
        <div 
          ref={manufacturers2ContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide mt-5"
          onMouseEnter={pauseAutoScroll}
          onMouseLeave={resumeAutoScroll}
          onTouchStart={pauseAutoScroll}
          onTouchEnd={resumeAutoScrollDelayed}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* First set of manufacturers for infinite scroll */}
          {manufacturers2.map((brand) => (
            <div key={`first-${brand.id}`} className="flex-shrink-0 cursor-pointer" onClick={() => handleBrandClick(brand.name)}>
              <div className="flex flex-col items-center">
                <div className="w-[116px] h-[116px] rounded-full border-2 border-gray-200 p-2 flex items-center justify-center shadow-md hover:shadow-lg transition-all hover:border-2 hover:border-[#f29f05] bg-white overflow-hidden">
                  <img 
                    src={brand.logo} 
                    alt={brand.name} 
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-sm text-center mt-2 font-medium text-gray-700">{brand.name}</p>
              </div>
            </div>
          ))}
          
          {/* Second set of manufacturers for infinite scroll */}
          {manufacturers2.map((brand) => (
            <div key={`second-${brand.id}`} className="flex-shrink-0 cursor-pointer" onClick={() => handleBrandClick(brand.name)}>
              <div className="flex flex-col items-center">
                <div className="w-[116px] h-[116px] rounded-full border-2 border-gray-200 p-2 flex items-center justify-center shadow-md hover:shadow-lg transition-all hover:border-2 hover:border-[#f29f05] bg-white overflow-hidden">
                  <img 
                    src={brand.logo} 
                    alt={brand.name} 
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-sm text-center mt-2 font-medium text-gray-700">{brand.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}