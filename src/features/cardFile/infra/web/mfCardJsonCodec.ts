import type { MfCardFileV1 } from "@/features/cardFile/domain/mfCard.types";
import { MfCardValidationError } from "@/features/cardFile/domain/mfCard.types";
import { validateMfCardFile } from "@/features/cardFile/domain/mfCardGuards";



const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();



const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new MfCardValidationError("mfcard の JSON を解析できません。", [
      {
        level: "error",
        code: "invalid_json",
        path: "card.json",
        message: "mfcard の JSON を解析できません。",
      },
    ]);
  }
};
const encodeMfCardFile = (file: MfCardFileV1): Uint8Array => {
  return textEncoder.encode(`${JSON.stringify(file, null, 2)}\n`);
};
const decodeMfCardFile = (buffer: ArrayBuffer): MfCardFileV1 => {
  const parsed = parseJson(textDecoder.decode(buffer));
  const validation = validateMfCardFile(parsed);

  if (!validation.ok) {
    throw new MfCardValidationError(
      "mfcard v1 として読み込めません。",
      validation.issues,
    );
  }

  return validation.value;
};



export { encodeMfCardFile, decodeMfCardFile };
