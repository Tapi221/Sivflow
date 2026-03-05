import React from 'react';
import { motion } from 'framer-motion';
import { useSpring, animated } from 'react-spring';
import { Star } from '@/ui/icons';
import { sanitizeStreak } from '@/utils/streak';

export const StampRally = ({ currentStreak = 1, compact = false }) => {
  const DOT_SIZE_PX = 12; // w-3 h-3
  const DOT_CENTER_PX = DOT_SIZE_PX / 2;
  const TRACK_INSET_PX = 6; // align line ends to edge-dot centers
  const BG_LINE_TOP_PX = DOT_CENTER_PX - 1; // 2px line center
  const FG_LINE_TOP_PX = DOT_CENTER_PX - 1.5; // 3px line center
  const safeStreak = sanitizeStreak(currentStreak);
  const stampedCount = Math.min(safeStreak, 7);
  const showSevenDayCelebration = stampedCount === 7;
  const days = Array.from({ length: 7 }, (_, i) => ({
    dayNum: i + 1,
    isStamped: i < stampedCount,
    isCurrent: stampedCount > 0 && i === stampedCount - 1,
  }));
  const progressPercent = (() => {
    if (stampedCount <= 1) return 0;
    return ((stampedCount - 1) / 6) * 100;
  })();

  const { number } = useSpring({
    from: { number: Math.max(0, safeStreak - 1) },
    to: { number: safeStreak },
    config: { duration: 180 }
  });

  return (
    <div className={`w-full max-w-4xl mx-auto bg-white/50 border border-white shadow-sm backdrop-blur-sm ${compact ? 'p-3 md:p-4 rounded-[28px] md:rounded-[36px]' : 'p-4 md:p-8 rounded-[32px] md:rounded-[48px]'}`}>
      <div className={`text-center ${compact ? 'mb-4' : 'mb-7'}`}>
        <h3 className={`font-bold text-slate-400 tracking-[0.3em] uppercase mb-2 ${compact ? 'text-[11px]' : 'text-sm'}`}>週間連続達成日数</h3>
        <div className={`flex items-center justify-center gap-2 font-black text-slate-700 italic ${compact ? 'text-3xl md:text-4xl' : 'text-4xl md:text-6xl'}`}>
          <animated.span>{number.to((n) => Math.floor(n))}</animated.span>
          <span className={`text-primary-600 not-italic ${compact ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'}`}>日</span>
        </div>
        <p className="mt-2 text-xs text-slate-400">{stampedCount} / 7</p>
      </div>

      <div className="relative w-full max-w-xl mx-auto flex items-start justify-center">
        <div className="relative w-full">
          <div
            className="absolute h-[2px] bg-slate-200"
            style={{
              left: `${TRACK_INSET_PX}px`,
              right: `${TRACK_INSET_PX}px`,
              top: `${BG_LINE_TOP_PX}px`,
            }}
          />
          <div
            className="absolute h-[3px] bg-primary-600 transition-all duration-300"
            style={{
              left: `${TRACK_INSET_PX}px`,
              top: `${FG_LINE_TOP_PX}px`,
              width: `calc((100% - ${TRACK_INSET_PX * 2}px) * ${progressPercent / 100})`,
            }}
          />

          <div className="relative z-10 flex h-3 w-full items-center justify-between">
            {days.map((day) => {
              const isFinalStar = showSevenDayCelebration && day.dayNum === 7;

              if (isFinalStar) {
                return (
                  <motion.div
                    key={day.dayNum}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: [0, 1, 1], scale: [0.95, 1.05, 1] }}
                    transition={{ duration: 0.2, times: [0, 0.6, 1], ease: 'easeOut' }}
                    className="w-3.5 h-3.5 flex items-center justify-center"
                  >
                    <Star className="w-4 h-4 text-primary-600 fill-primary-600" />
                  </motion.div>
                );
              }

              if (day.isCurrent) {
                return (
                  <div
                    key={day.dayNum}
                    className="w-3.5 h-3.5 rounded-full border border-primary-600 bg-primary-600 scale-125 shadow-sm"
                  />
                );
              }

              const baseDotClass = day.isStamped
                ? 'bg-primary-600 border-primary-600'
                : 'bg-white border-slate-300 opacity-40';

              return (
                <div
                  key={day.dayNum}
                  className={`w-3 h-3 rounded-full border ${baseDotClass}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={`text-center text-slate-500 font-medium ${compact ? 'mt-4 text-sm' : 'mt-8'}`}
      >
        {`${safeStreak}日連続達成！`}
      </motion.div>
    </div>
  );
};
