import React from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const NavButton = React.memo(({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all duration-300 relative flex-1",
      active ? "text-amber-600 scale-105" : "text-slate-400"
    )}
  >
    <Icon size={22} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
    {active && (
      <motion.div 
        layoutId="nav-indicator" 
        className="absolute -bottom-1 w-1 h-1 bg-amber-600 rounded-full"
      />
    )}
  </button>
));
