import { validateMfCardFile } from "@/features/cardFile/domain/mfCardGuards";
import {
  type MfCardFileV1,
  MfCardValidationError,
} from "@/features/cardFile/domain/mfCardTypes";

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

export const encodeMfCardFile = (file: MfCardFileV1): Uint8Array => {
  return textEncoder.encode(`${JSON.stringify(file, null, 2)}\n`);
};

export const decodeMfCardFile = (buffer: ArrayBuffer): MfCardFileV1 => {
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
