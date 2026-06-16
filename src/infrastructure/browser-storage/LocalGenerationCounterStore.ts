import type { GenerationCounterStorePort } from "@/application/ports/GenerationCounterStorePort";



const GENERATION_COUNTER_KEY = "sivflow_generation_counter";
const LEGACY_GENERATION_COUNTER_KEY = "flashcard_generation_counter";



const get = (): number => {
  if (typeof window === "undefined") {
    return 0;
  }

  const stored = localStorage.getItem(GENERATION_COUNTER_KEY) ?? localStorage.getItem(LEGACY_GENERATION_COUNTER_KEY);
  const parsed = stored ? parseInt(stored, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};
const increment = (): number => {
  if (typeof window === "undefined") {
    return 0;
  }

  const next = get() + 1;
  localStorage.setItem(GENERATION_COUNTER_KEY, String(next));
  localStorage.removeItem(LEGACY_GENERATION_COUNTER_KEY);
  return next;
};



const localGenerationCounterStore: GenerationCounterStorePort = { get, increment };



export { localGenerationCounterStore };
