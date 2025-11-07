"use client";
import { useState, useEffect } from 'react';
import { specialGothic } from '@/app/fonts';

export default function Poster() {
  const [isBouncing, setIsBouncing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      // Start bouncing
      setIsBouncing(true);
      
      // Stop bouncing after 4 seconds
      setTimeout(() => setIsBouncing(false), 1000);
    }, 4000); // Repeats every 8 seconds (4s bounce + 4s pause)

    return () => clearInterval(interval);
  }, []);

  return (
    <div className=" py-[50px] bg-white px-12 ">
      <div className="bg-[url('/car-bg.png')] rounded-lg bg-cover bg-center w-full h-[300px] sm:h-[450px] flex flex-col sm:flex-row items-center px-4 sm:px-30">
        {/* Left side text content */}
        <div className="w-full sm:w-1/2 text-white text-center sm:text-left">
          <h1 className='bg-red-700 text-white w-[80px] sm:w-[90px] text-center p-1 mb-3 sm:mb-5 font-bold text-xs sm:text-sm rounded-lg mx-auto sm:mx-0'>Top brands</h1>
          <h1 className="text-2xl sm:text-6xl text-[#f29f05] whitespace-nowrap font-bold">BRAKE SYSTEM </h1>
          <h2 className="text-lg sm:text-3xl font-bold text-white whitespace-nowrap mt-4 sm:mt-8">WE'VE GOT YOU COVERED</h2>
          <h3 className="text-lg sm:text-3xl font-bold text-white whitespace-nowrap mt-4 sm:mt-10">Great Values. Always.</h3>
          <button suppressHydrationWarning className="bg-white hover:bg-black hover:text-white text-black font-bold px-4 sm:px-6 py-2 rounded-lg mt-4 sm:mt-10 text-sm sm:text-base">
            Shop Now ➜
          </button>
        </div>

        {/* Right side bouncing image */}
        <div className="w-full sm:w-1/2 mt-4 sm:mt-30 flex justify-center">
          <img 
            src="/tyres2.png" 
            alt="Car" 
            className="w-[200px] sm:w-[500px] animate-float" // Custom floating effect
          />
        </div>
      </div>
    </div>
  );
}