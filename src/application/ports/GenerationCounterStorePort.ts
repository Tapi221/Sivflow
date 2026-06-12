interface GenerationCounterStorePort {
  get: () => number;
  increment: () => number;
}

export type { GenerationCounterStorePort };
