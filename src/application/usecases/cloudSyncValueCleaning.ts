const deepStripUndefined = (input: unknown): unknown => {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (input instanceof Date) return input;

  if (Array.isArray(input)) {
    return input.map(deepStripUndefined).filter((v) => v !== undefined);
  }

  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      const cleaned = deepStripUndefined(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }

  return input;
};



export { deepStripUndefined };
