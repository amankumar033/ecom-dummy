"use client";
import { useState } from 'react';
// Update the import path below to the actual location of your font file
// import { specialGothic } from '../fonts';

export default function Home() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPosition({ x, y });
  };

  // Calculate years once to prevent hydration mismatch
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({length: 10}, (_, i) => currentYear - i);

  return (
    <div className="relative w-full h-[540px]">
      {/* Background Image */}
      <img 
        src="/woody.jpg" 
        alt="Background" 
        className="absolute inset-0 w-screen h-[540px] object-cover"
      />
      
      {/* Main Content Row */}
      <div className="relative z-20 w-full h-full flex flex-col sm:flex-row items-center justify-center px-4 sm:pl-12 py-8 sm:py-0">
        {/* Middle Headings Column - Centered with single-line heading */}
        <div className="flex-1 flex flex-col justify-center items-center sm:items-start px-4 sm:pl-[90px] text-center sm:text-left mb-6 sm:mb-0">
          <h1 className="text-3xl sm:text-6xl font-bold text-[#034c8c] whitespace-nowrap">JUMP STARTERS</h1>
          <h2 className="text-xl sm:text-3xl font-semibold text-white mt-4 sm:mt-8">NEVER GET STUCK AGAIN</h2>
          <h3 className="text-lg sm:text-2xl font-medium text-white mt-2 sm:mt-4">Plus Price Lock on 100 of line</h3>
          <button className="mt-4 sm:mt-8 w-[140px] sm:w-[180px] bg-white text-black py-2 flex items-center justify-center gap-2 rounded-lg hover:bg-black transition-colors hover:text-white font-bold text-sm sm:text-base mx-auto sm:mx-0">Shop Now <span className='font-bold text-xl sm:text-2xl'>➞</span></button>
        </div>

        {/* Image with Hover Effect */}
        <div 
          className="relative flex items-center justify-center sm:justify-end mt-4 sm:mt-0"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onMouseMove={isHovering ? handleMouseMove : undefined}
        >
          <div className='w-[80px] h-[80px] sm:w-[120px] sm:h-[120px] bg-amber-700 rounded-full flex flex-col items-center justify-center absolute top-[150px] sm:top-[250px] right-[50px] sm:right-[260px] z-30 transform -translate-y-1/2 rotate-20'>
            <h1 className='text-sm sm:text-xl font-bold'>From</h1>
            <h1 className='text-lg sm:text-3xl font-bold'>₹250</h1>
          </div>
          <img
            src="/toolbag.png"
            alt="Foreground"
            className="w-[250px] sm:w-[500px] mt-[20px] sm:mt-[50px] transition-all duration-100 ease-linear transform cursor-pointer"
            style={{
              transform: isHovering 
                ? `translate(${position.x * 80 - 40}px, ${position.y * 80 - 40}px)` 
                : 'none',
              transformOrigin: 'center center',
              willChange: 'transform'
            }}
          />
        </div>
      </div>
    </div>
  );
} 