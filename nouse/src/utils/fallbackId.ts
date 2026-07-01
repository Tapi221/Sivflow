import { asRecord } from "@/utils/records";

const makeFallbackId = () => {
  try {
    const cryptoObject = asRecord(globalThis.crypto as unknown);
    const randomUUID = cryptoObject?.randomUUID;
    if (typeof randomUUID === "function") {
      return (randomUUID as () => string)();
    }
  } catch {
    // ignore: randomUUID not available
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export { makeFallbackId };
