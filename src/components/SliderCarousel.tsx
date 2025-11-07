"use client";
import { useState, useRef, useEffect } from 'react';
import Slider1 from "@/app/pages/Slider1";
import Slider2 from "@/app/pages/Slider2";
import Slider3 from "@/app/pages/Slider3";

export default function SliderCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoScrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const slides = [
    { id: 1, component: <Slider1 />, title: "Wiper Blades" },
    { id: 2, component: <Slider2 />, title: "Jump Starters" },
    { id: 3, component: <Slider3 />, title: "Motor Oil" }
  ];

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
    }, 1000);
  };

  // Manual navigation
  const goToSlide = (index: number) => {
    pauseAutoScroll();
    setCurrentSlide(index);
    resumeAutoScrollDelayed();
  };

  const goToPreviousSlide = () => {
    pauseAutoScroll();
    setCurrentSlide(prev => prev === 0 ? slides.length - 1 : prev - 1);
    resumeAutoScrollDelayed();
  };

  const goToNextSlide = () => {
    pauseAutoScroll();
    setCurrentSlide(prev => (prev + 1) % slides.length);
    resumeAutoScrollDelayed();
  };

  // Auto-scroll functionality
  useEffect(() => {
    if (isAutoScrolling) {
      autoScrollInterval.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % slides.length);
      }, 4000); // Change slide every 4 seconds for better engagement
    }

    return () => {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
      }
    };
  }, [isAutoScrolling, slides.length]);

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        goToPreviousSlide();
      } else if (event.key === 'ArrowRight') {
        goToNextSlide();
      } else if (event.key === ' ') {
        event.preventDefault();
        setIsAutoScrolling(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-b from-gray-50 to-white">
      {/* Carousel Container */}
      <div 
        ref={carouselRef}
        className="flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        onMouseEnter={pauseAutoScroll}
        onMouseLeave={resumeAutoScroll}
        onTouchStart={pauseAutoScroll}
        onTouchEnd={resumeAutoScrollDelayed}
      >
        {slides.map((slide, index) => (
          <div key={slide.id} className="w-full flex-shrink-0">
            {slide.component}
          </div>
        ))}
      </div>

      {/* Professional Navigation Arrows */}
      <button
        onClick={goToPreviousSlide}
        className="absolute left-6 top-1/2 transform -translate-y-1/2 z-30 bg-white/90 hover:bg-white text-gray-800 p-4 rounded-full shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl border border-gray-200"
        aria-label="Previous slide"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={goToNextSlide}
        className="absolute right-6 top-1/2 transform -translate-y-1/2 z-30 bg-white/90 hover:bg-white text-gray-800 p-4 rounded-full shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl border border-gray-200"
        aria-label="Next slide"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Professional Progress Bar */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30">
        <div className="flex space-x-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-500 ease-in-out ${
                index === currentSlide
                  ? 'w-8 h-2 bg-white rounded-full shadow-lg'
                  : 'w-2 h-2 bg-white/50 rounded-full hover:bg-white/75 hover:scale-125'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      
    </div>
  );
}
