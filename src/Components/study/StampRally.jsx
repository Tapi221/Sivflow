import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpring, animated } from 'react-spring';
import { Check, Star, Heart, Sparkles, Flower } from 'lucide-react';

const StampCharacter = ({ date, dayIndex, intensity }) => {
  // Random organic offset
  const randomRotation = React.useMemo(() => Math.random() * 10 - 5, []); // -5 to 5 deg
  const randomX = React.useMemo(() => Math.random() * 4 - 2, []); // -2 to 2 px
  const randomY = React.useMemo(() => Math.random() * 4 - 2, []); 

  // Colors based on intensity
  const colors = {
    base: intensity >= 5 ? '#FCD34D' : '#E2E8F0', // Gold or Slate
    /* 動的なアクセントカラーに対応 */
    border: intensity >= 5 ? '#F59E0B' : 'var(--color-primary-600-hex, #689A98)', 
    body: intensity >= 5 ? '#FFFBEB' : '#F0FDFA',
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, rotate: randomRotation - 30 }}
      animate={{ scale: 1, opacity: 1, rotate: randomRotation, x: randomX, y: randomY }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 15,
        delay: dayIndex * 0.1 
      }}
      className="relative w-16 h-16 md:w-20 md:h-20"
    >
      {/* Stamp Body */}
      <div 
        className="w-full h-full rounded-full border-4 flex items-center justify-center relative shadow-sm overflow-hidden"
        style={{ borderColor: colors.border, backgroundColor: colors.body }}
      >
        {/* Character Face (Simple CSS representation) */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-2">
           <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-slate-700"></div>
           <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-slate-700"></div>
        </div>
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-3 h-1.5 md:w-4 md:h-2 rounded-full bg-pink-300 opacity-60"></div>
        
        {/* Date on Stomach */}
        <div className="mt-4 bg-white/80 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold text-slate-600 font-mono tracking-tighter">
          {date}
        </div>
      </div>
      
      {/* Sparkles for high intensity */}
      {intensity >= 3 && (
        <>
          <Sparkles className="absolute -top-2 -right-2 w-4 h-4 text-emerald-400 animate-pulse" />
          <Star className="absolute -bottom-1 -left-1 w-3 h-3 text-yellow-400 fill-yellow-400 animate-bounce" style={{ animationDuration: '2s' }} />
        </>
      )}
      {intensity >= 7 && (
         <motion.div 
            className="absolute inset-0 rounded-full border-2 border-yellow-400"
            animate={{ scale: [1, 1.5], opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
         />
      )}
    </motion.div>
  );
};

export const StampRally = ({ currentStreak = 1, onComplete }) => {
  // Simulate 7 days
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    // Current day is 0-indexed in array but let's assume streak maps to 1-7
    // If streak is 3, we show stamps for 1, 2, 3 (today).
    // Logic: last 7 days including today? Or fixed weekly slot?
    // Plan suggests "7-day stamp rally" emphasizing cumulative achievement.
    // Let's visualize a 7-day track.
    
    // For demo purposes:
    // If streak is 3: days 0, 1 are past. day 2 is today (just stamped). 3-6 are future.
    // However, streak can be >7. We should show (streak % 7) or cap at 7?
    // User says "As it approaches 7th day...". Implies a cycle. 
    
    const cycleDay = ((currentStreak - 1) % 7) + 1; // 1 to 7
    const isStamped = (i + 1) <= cycleDay;
    const isToday = (i + 1) === cycleDay;
    
    // Calculate date for previous/current days
    const d = new Date();
    d.setDate(today.getDate() - (cycleDay - (i + 1)));
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    
    return {
      dayNum: i + 1,
      isStamped,
      isToday,
      date: dateStr,
      intensity: i + 1 // 1-7 intensity
    };
  });

  const { number } = useSpring({
    from: { number: Math.max(0, currentStreak - 1) },
    to: { number: currentStreak },
    delay: 500,
    config: { mass: 1, tension: 20, friction: 10 }
  });

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 bg-white/50 rounded-[32px] md:rounded-[48px] border border-white shadow-sm backdrop-blur-sm">
      <div className="text-center mb-8">
        <h3 className="text-sm font-bold text-slate-400 tracking-[0.3em] uppercase mb-2">Daily Streak</h3>
        <div className="flex items-center justify-center gap-2 text-4xl md:text-6xl font-black text-slate-700 italic">
          <animated.span>{number.to(n => Math.floor(n))}</animated.span>
          <span className="text-2xl md:text-3xl text-primary-600 not-italic">DAYS</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 md:gap-6">
        {days.map((day) => (
          <div key={day.dayNum} className="relative group">
             {/* Slot Background */}
             <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center">
                <span className="text-slate-300 font-bold text-sm">{day.dayNum}</span>
             </div>
             
             {/* Stamp Overlay */}
             {day.isStamped && (
               <div className="absolute inset-0 flex items-center justify-center z-10 w-full h-full">
                 <StampCharacter 
                    date={day.date} 
                    dayIndex={day.dayNum} 
                    intensity={day.intensity} 
                 />
                 {day.isToday && (
                    <motion.div
                        className="absolute inset-0 z-0 bg-white/0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                         {/* Particle effects for today */}
                         {day.intensity >= 5 && <Sparkles className="absolute -top-4 left-0 text-yellow-400 w-6 h-6 animate-spin-slow" />}
                         {day.intensity >= 7 && <Flower className="absolute -bottom-4 right-0 text-pink-400 w-6 h-6 animate-bounce" />}
                    </motion.div>
                 )}
               </div>
             )}
          </div>
        ))}
      </div>
      
      {/* Decorative Message based on streak */}
      <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 1.5 }}
         className="text-center mt-8 text-slate-500 font-medium"
      >
        {currentStreak % 7 === 0 ? "🎉 Incredible! 7 Days Streak! 🎉" : "Keep it up! Consistency is key."}
      </motion.div>
    </div>
  );
};
