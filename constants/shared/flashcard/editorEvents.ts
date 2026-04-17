export const CARD_SET_VIEW_EVENTS = {
  editingChange: "cardsetview:editing-change",
  editingDraftPatch: "cardsetview:editing-draft-patch",
  createCardRequest: "cardsetview:create-card-request",
  toggleEditingRequest: "cardsetview:toggle-editing-request",
} as const;

export const CARD_EDITOR_EVENTS = {
  cardSetViewEditingDraftPatch: CARD_SET_VIEW_EVENTS.editingDraftPatch,
} as const;
