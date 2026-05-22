import { useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useT } from "@/i18n/useT";

type NewTaskButtonProps = {
  onClick: () => void;
};

type Ripple = {
  id: number;
  x: number;
  y: number;
};

export const NewTaskButton = ({ onClick }: NewTaskButtonProps) => {
  const t = useT();
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();

    const ripple: Ripple = {
      id: Date.now(),
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    setRipples((current) => [...current, ripple]);

    window.setTimeout(() => {
      setRipples((current) =>
        current.filter((item) => item.id !== ripple.id),
      );
    }, 420);

    onClick();
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className="
        relative isolate flex items-center gap-1.5 overflow-hidden
        rounded-full border border-[#e4eaf1] bg-[#f7f9fc]/90 px-3 py-1.5
        text-[12px] font-medium text-[#193a5c]
        shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_2px_rgba(15,23,42,0.04)]
        transition-[background-color,border-color,color,box-shadow] duration-200 ease-out
        hover:border-[#dbe3ec] hover:bg-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(15,23,42,0.06)]
      "
    >
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ opacity: 0.14, scale: 0 }}
            animate={{ opacity: 0, scale: 1.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.42, ease: "easeOut" }}
            className="pointer-events-none absolute z-0 h-20 w-20 rounded-full bg-[#193a5c]"
            style={{
              left: ripple.x,
              top: ripple.y,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </AnimatePresence>

      <svg
        viewBox="0 0 14 14"
        fill="none"
        className="relative z-10 h-3.5 w-3.5 opacity-90"
      >
        <path
          d="M7 2.5v9M2.5 7h9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      <span className="relative z-10">{t.addTask}</span>
    </motion.button>
  );
};