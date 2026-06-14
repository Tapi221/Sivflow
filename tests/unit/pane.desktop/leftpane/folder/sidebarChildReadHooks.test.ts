import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CARD_SETS_SOURCE_PATH = resolve(process.cwd(), "src/components/card/hooks/useCardSets.ts");
const NOTES_SOURCE_PATH = resolve(process.cwd(), "src/hooks/note/useNotes.ts");
const DOCUMENTS_SOURCE_PATH = resolve(process.cwd(), "src/features/document/hooks/useDocumentsRead.ts");

const readSource = (path: string): string => readFileSync(path, "utf8");

describe("sidebar child read hooks", () => {
  it("uses the effective local user id for card set, note, and document reads", () => {
    const cardSetsSource = readSource(CARD_SETS_SOURCE_PATH);
    const notesSource = readSource(NOTES_SOURCE_PATH);
    const documentsSource = readSource(DOCUMENTS_SOURCE_PATH);

    expect(cardSetsSource).toContain("useEffectiveLocalUserId");
    expect(notesSource).toContain("useEffectiveLocalUserId");
    expect(documentsSource).toContain("useEffectiveLocalUserId");
    expect(cardSetsSource).not.toContain("const userId = currentUser?.uid ?? null;");
    expect(notesSource).not.toContain("const userId = currentUser?.uid ?? null;");
    expect(documentsSource).not.toContain("const userId = currentUser?.uid ?? null;");
  });
});