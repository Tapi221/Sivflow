import type { Card } from "@/types";

interface RecommendationScore {
  card: Card;
  score: number;
  reasons: string[];
}

/**
 * Calculate recommendation scores for candidate cards based on context cards (e.g., already placed on map)
 */
export function getRecommendedCards(
  candidates: Card[],
  contextCards: Card[],
  limit: number = 5,
): Card[] {
  if (contextCards.length === 0) {
    // Cold start: Return random or latest cards
    // For now, return random sample
    return [...candidates].sort(() => 0.5 - Math.random()).slice(0, limit);
  }

  // 1. Extract context features (tags, folderIds)
  const contextTags = new Set<string>();
  const contextFolders = new Set<string>();
  const contextKeywords = new Set<string>();

  contextCards.forEach((c) => {
    c.tags?.forEach((t) => contextTags.add(typeof t === "string" ? t : t)); // handle string or Tag object if mixed
    if (c.folderId) contextFolders.add(c.folderId);

    // Simple keyword extraction (naive)
    c.questionText.split(" ").forEach((w) => {
      if (w.length > 3) contextKeywords.add(w.toLowerCase());
    });
  });

  // 2. Score candidates
  const scored: RecommendationScore[] = candidates.map((card) => {
    let score = 0;
    const reasons: string[] = [];

    // Tag Match
    if (card.tags) {
      let matchCount = 0;
      card.tags.forEach((t) => {
        const tagName = typeof t === "string" ? t : t;
        if (contextTags.has(tagName)) matchCount++;
      });
      if (matchCount > 0) {
        score += matchCount * 2;
        reasons.push(`${matchCount} tags match`);
      }
    }

    // Folder Match
    if (contextFolders.has(card.folderId)) {
      score += 1;
      reasons.push("Same folder");
    }

    // Keyword Match (Naive)
    let keywordMatches = 0;
    const text = (card.questionText + " " + card.title).toLowerCase();
    contextKeywords.forEach((k) => {
      if (text.includes(k)) keywordMatches++;
    });
    if (keywordMatches > 0) {
      score += keywordMatches * 0.5;
      // reasons.push('Keyword match');
    }

    return { card, score, reasons };
  });

  // 3. Sort and filter
  // Filter out zero scores if we want strict recommendation, or keep them for fallback
  const recommended = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.card);

  // Fallback if not enough recommendations
  if (recommended.length < limit) {
    const remaining = candidates.filter(
      (c) => !recommended.find((r) => r.id === c.id),
    );
    const fill = remaining
      .sort(() => 0.5 - Math.random())
      .slice(0, limit - recommended.length);
    return [...recommended, ...fill];
  }

  return recommended;
}



