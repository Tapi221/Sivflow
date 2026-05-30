export type CardSetDeleteCard = {
  id: string;
  isDeleted?: boolean;
};

export type CardSetDeleteRepository<TCard extends CardSetDeleteCard = CardSetDeleteCard> = {
  listCardsByCardSetId: (userId: string, cardSetId: string) => Promise<TCard[]>;
  softDeleteCard: (userId: string, cardId: string) => Promise<void>;
  softDeleteCardSet: (userId: string, cardSetId: string) => Promise<void>;
};

export const deleteCardSetWithCards = async <
  TCard extends CardSetDeleteCard,
>({
  userId,
  cardSetId,
  repository,
}: {
  userId: string;
  cardSetId: string;
  repository: CardSetDeleteRepository<TCard>;
}): Promise<void> => {
  const cards = await repository.listCardsByCardSetId(userId, cardSetId);

  for (const card of cards) {
    if (!card.isDeleted) {
      await repository.softDeleteCard(userId, card.id);
    }
  }

  await repository.softDeleteCardSet(userId, cardSetId);
};
