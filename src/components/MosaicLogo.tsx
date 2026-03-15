import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const MosaicLogo = React.memo(({ className }: { className?: string }) => {
  const mosaicColors = [
    'bg-amber-500', // Gold
    'bg-blue-700',  // Deep Blue
    'bg-emerald-600', // Green
    'bg-red-700',    // Red
    'bg-slate-200',  // White/Stone
    'bg-amber-400', // Light Gold
    'bg-blue-900',  // Dark Blue
    'bg-emerald-800' // Dark Green
  ];

  return (
    <div className={cn("relative w-12 h-12 overflow-hidden rounded-xl shadow-lg shrink-0 border-2 border-slate-900/10", className)}>
      <div className="grid grid-cols-5 grid-rows-5 w-full h-full">
        {[...Array(25)].map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "w-full h-full border-[0.2px] border-black/5",
              mosaicColors[Math.floor(Math.abs(Math.sin(i + 1) * mosaicColors.length))]
            )}
          />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30 backdrop-blur-[0.5px]">
        <span className="text-white font-black text-sm tracking-tighter drop-shadow-md">BX</span>
      </div>
    </div>
  );
});
