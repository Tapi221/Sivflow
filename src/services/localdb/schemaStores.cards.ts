const CARD_STORES = { cardSets: "id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]", cards: "id, userId, folderId, cardSetId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate], [cardSetId+isDeleted], *tagIds" };



export { CARD_STORES };
