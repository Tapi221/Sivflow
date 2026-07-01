const extractCreatedCardId = (created: unknown): string | null => {
  if (typeof created === "string") {
    return created;
  }

  if (
    typeof created === "object" &&
    created !== null &&
    "id" in created &&
    typeof (created as { id?: unknown; }).id === "string"
  ) {
    return (created as { id: string; }).id;
  }

  if (
    typeof created === "object" &&
    created !== null &&
    "cardId" in created &&
    typeof (created as { cardId?: unknown; }).cardId === "string"
  ) {
    return (created as { cardId: string; }).cardId;
  }

  return null;
};



export { extractCreatedCardId };
