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
    }, 520);

    onClick();
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileTap={{ scale: 0.96 }}
      whileHover={{ filter: "brightness(1.08)" }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className="
        relative isolate flex items-center gap-1.5 overflow-hidden
        rounded-lg bg-[#193a5c] px-3 py-1.5
        text-[12px] font-semibold text-white shadow-sm
      "
    >
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ opacity: 0.45, scale: 0 }}
            animate={{ opacity: 0, scale: 1.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.52, ease: "easeOut" }}
            className="pointer-events-none absolute z-0 h-24 w-24 rounded-full bg-white/30"
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
        className="relative z-10 h-3.5 w-3.5"
      >
        <path
          d="M7 2.5v9M2.5 7h9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>

      <span className="relative z-10">{t.addTask}</span>
    </motion.button>
  );
};