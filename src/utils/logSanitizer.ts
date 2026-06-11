const SENSITIVE_KEYS = new Set([
  "text",
  "content",
  "questionText",
  "answerText",
  "question",
  "answer",
  "memo",
  "note",
  "description",
  "front",
  "back",
  "fields",
  "_rescueRaw",
]);
const REDACTED = "[REDACTED]";



const sanitizeValue = (value: unknown, depth: number): unknown => {
  if (depth > 4) return "[TRUNCATED]";
  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 120)}...` : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }
  if (!value || typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = REDACTED;
      continue;
    }
    out[k] = sanitizeValue(v, depth + 1);
  }
  return out;
};
const sanitizeForLog = <T>(value: T): T => {
  return sanitizeValue(value, 0) as T;
};



export { sanitizeForLog };
