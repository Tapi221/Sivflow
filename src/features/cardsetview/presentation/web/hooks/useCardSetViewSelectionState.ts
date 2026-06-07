import { type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clampCardIndex, createCardSetViewSourceKey, resolveCardIndexById, resolveCardsForPager, toggleFlippedCardId } from "@/features/cardsetview/domain/cardSetViewState";
import { useCardEntity } from "@/components/card/hooks/useCardEntity";
import { getCardSetViewFlippedCardIds, setCard