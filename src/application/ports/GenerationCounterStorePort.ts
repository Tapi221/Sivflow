export interface GenerationCounterStorePort {
  get: () => number;
  increment: () => number;
}
