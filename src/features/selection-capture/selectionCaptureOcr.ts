import { createWorker } from "tesseract.js";



const recognizeSelectionCaptureText = async (blob: Blob): Promise<string | null> => {
  const worker = await createWorker("jpn+eng");

  try {
    const result = await worker.recognize(blob);
    const text = result.data.text.trim();
    return text.length > 0 ? text : null;
  } finally {
    await worker.terminate();
  }
};



export { recognizeSelectionCaptureText };
