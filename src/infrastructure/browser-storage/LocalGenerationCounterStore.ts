import type { GenerationCounterStorePort } from "@/application/ports/GenerationCounterStorePort";

const GENERATION_COUNTER_KEY = "flashcard_generation_counter";

const get = (): number => {
  if (typeof window === "undefined") {
    return 0;
  }

  const stored = localStorage.getItem(GENERATION_COUNTER_KEY);
  const parsed = stored ? parseInt(stored, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

const increment = (): number => {
  if (typeof window === "undefined") {
    return 0;
  }

  const next = get() + 1;
  localStorage.setItem(GENERATION_COUNTER_KEY, String(next));
  return next;
};

export const localGenerationCounterStore: GenerationCounterStorePort = {
  get,
  increment,
};
