"use client";
import { useState, useEffect, useRef } from 'react';
import Slider1 from "./Slider1";
import Slider2 from "./Slider2";
import Slider3 from "./Slider3";

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const slides = [<Slider1 key={0} />, <Slider2 key={1} />, <Slider3 key={2} />];
  const autoSlideInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // const _goToSlide = (index: number) => {
  //   setCurrentSlide(index);
  //   resetAutoSlide();
  // };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    resetAutoSlide();
  };

  // const _goToPrev = () => {
  //   setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  //   resetAutoSlide();
  // };

  const resetAutoSlide = () => {
    if (autoSlideInterval.current) {
      clearInterval(autoSlideInterval.current);
    }
    autoSlideInterval.current = setInterval(goToNext, 3000);
  };

  useEffect(() => {
    resetAutoSlide();
    return () => {
      if (autoSlideInterval.current) {
        clearInterval(autoSlideInterval.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full overflow-hidden">
      {/* Slides Container */}
      <div 
        ref={sliderRef}
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <div key={index} className="w-full flex-shrink-0">
            {slide}
          </div>
        ))}
      </div>

      {/* No Navigation Elements */}
    </div>
  );
}