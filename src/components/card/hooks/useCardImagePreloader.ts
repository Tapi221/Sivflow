import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { storage } from "@platform/firebase/client";
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import { getCardImages } from "@/domain/card/content";
import { getBlobCacheStats, getOrCreateImageBlobUrl } from "@/services/imageBlobUrlSessionCache";
import { getCachedRemoteUrl, getPreloadCacheStats, isUrlDecoded, markUrlDecoded, setCachedRemoteUrl } from "@/services/imagePreloadCache";
import { getLocalDb } from "@/services/localdb";
import type { Card, UploadedImage } from "@/types/domain/card";



type IdleHandle = ReturnType<typeof setTimeout>;
type RequestIdleCallback = (
  cb: () => void,
  opts?: { timeout: number; },
) => IdleHandle;
type CancelIdleCallback = (id: IdleHandle) => void;
type CardCatalogEntry = {
  id: string;
  signature: string;
  hasImages: boolean;
};



const CARD_IMAGE_PRELOAD_DEBUG_STORAGE_KEY = "sivflow_preload_debug";
const CARD_IMAGE_PRELOAD = {
  eagerRadiusFallback: 8,
  eagerBuffer: 2,
  idleExtra: 12,
  maxEagerConcurrent: 5,
} as const;



const isDebug = (): boolean =>
  typeof localStorage !== "undefined" &&
  localStorage.getItem(CARD_IMAGE_PRELOAD_DEBUG_STORAGE_KEY) === "1";
const extractImages = (card: Card) => {
  const imgs: UploadedImage[] = [];
  imgs.push(...getCardImages(card, "question"));
  imgs.push(...getCardImages(card, "answer"));
  return imgs;
};
const cardHasImages = (card: Card) => {
  return extractImages(card).length > 0;
};
const cardImageSignature = (card: Card) => {
  const imgs = extractImages(card);
  if (imgs.length === 0) return "";

  return imgs
    .map(
      (img) =>
        img.assetId ?? img.localFileId ?? img.remoteUrl ?? img.localUrl ?? "",
    )
    .join(",");
};
const resolveImageUrl = async (img: UploadedImage, userId: string | null) => {
  for (const value of [img.remoteUrl, img.localUrl]) {
    if (
      typeof value === "string" &&
      value.length > 0 &&
      !value.startsWith("blob:")
    ) {
      return value;
    }
  }

  const assetId = img.assetId ?? null;
  const localFileId = img.localFileId ?? assetId;

  if (localFileId) {
    const blobUrl = await getOrCreateImageBlobUrl(localFileId, {
      userId: userId ?? undefined,
    });
    if (blobUrl) return blobUrl;
  }

  if (assetId) {
    const cached = getCachedRemoteUrl(assetId);
    if (cached) return cached;
    if (!userId) return null;

    try {
      const db = await getLocalDb(userId);
      const asset = (await db.images.get(assetId)) as
        | { remoteKey?: string; }
        | undefined;
      const remoteKey = asset?.remoteKey;
      if (!remoteKey) return null;

      const url = await getDownloadURL(storageRef(storage, remoteKey));
      setCachedRemoteUrl(assetId, url);
      return url;
    } catch {
      return null;
    }
  }

  return null;
};
const decodeUrl = async (url: string) => {
  if (isUrlDecoded(url)) return;

  try {
    const img = new Image();
    img.src = url;
    await img.decode();
  } catch {
    // decode 失敗でも「済み」にして無限リトライを防ぐ
  }

  markUrlDecoded(url);
};
const preloadCard = async (
  card: Card,
  userId: string | null,
  signal: AbortSignal,
) => {
  const images = extractImages(card);
  await Promise.all(
    images.map(async (img) => {
      if (signal.aborted) return;
      const url = await resolveImageUrl(img, userId);
      if (!url || signal.aborted) return;
      await decodeUrl(url);
    }),
  );
};
const getRequestIdleCallback = (): RequestIdleCallback | null => {
  if (typeof window === "undefined" || !("requestIdleCallback" in window)) {
    return null;
  }

  return (window as unknown as { requestIdleCallback: RequestIdleCallback; })
    .requestIdleCallback;
};
const getCancelIdleCallback = (): CancelIdleCallback | null => {
  if (typeof window === "undefined" || !("cancelIdleCallback" in window)) {
    return null;
  }

  return (window as unknown as { cancelIdleCallback: CancelIdleCallback; })
    .cancelIdleCallback;
};
const buildCardCatalog = (cards: Card[]): CardCatalogEntry[] => {
  return cards.map((card) => ({
    id: card.id ?? "",
    signature: cardImageSignature(card),
    hasImages: cardHasImages(card),
  }));
};
const buildCatalogSignature = (catalog: CardCatalogEntry[]) => {
  return catalog.map((entry) => `${entry.id}:${entry.signature}`).join("|");
};
const resolvePreloadWindow = ({
  cardsLength,
  activeIndex,
  renderRange,
}: {
  cardsLength: number;
  activeIndex: number;
  renderRange?: { start: number; end: number; } | null;
}) => {
  const eagerStart = renderRange
    ? Math.max(0, renderRange.start - CARD_IMAGE_PRELOAD.eagerBuffer)
    : Math.max(0, activeIndex - CARD_IMAGE_PRELOAD.eagerRadiusFallback);

  const eagerEnd = renderRange
    ? Math.min(
      cardsLength - 1,
      renderRange.end + CARD_IMAGE_PRELOAD.eagerBuffer,
    )
    : Math.min(
      cardsLength - 1,
      activeIndex + CARD_IMAGE_PRELOAD.eagerRadiusFallback,
    );

  const idleStart = Math.max(0, eagerStart - CARD_IMAGE_PRELOAD.idleExtra);
  const idleEnd = Math.min(
    cardsLength - 1,
    eagerEnd + CARD_IMAGE_PRELOAD.idleExtra,
  );

  return {
    eagerStart,
    eagerEnd,
    idleStart,
    idleEnd,
  };
};
const useCardImagePreloader = (
  cards: Card[],
  activeIndex: number,
  userId: string | null,
  renderRange?: { start: number; end: number; } | null,
) => {
  const [readySet, setReadySet] = useState<Set<string>>(() => {
    const next = new Set<string>();

    for (const card of cards) {
      if (!card.id) continue;
      if (!cardHasImages(card)) next.add(card.id);
    }

    return next;
  });

  const signatureMapRef = useRef<Map<string, string>>(new Map());
  const readySetRef = useRef<Set<string>>(readySet);
  const pendingReadyIdsRef = useRef<Set<string>>(new Set());
  const flushReadyRafRef = useRef<number | null>(null);

  const cardCatalog = useMemo(() => buildCardCatalog(cards), [cards]);

  const preloadPlanSignature = useMemo(() => {
    if (cardCatalog.length === 0) {
      return "";
    }

    const { idleStart, idleEnd } = resolvePreloadWindow({
      cardsLength: cardCatalog.length,
      activeIndex,
      renderRange,
    });

    return buildCatalogSignature(cardCatalog.slice(idleStart, idleEnd + 1));
  }, [activeIndex, cardCatalog, renderRange]);

  useEffect(() => {
    readySetRef.current = readySet;
  }, [readySet]);

  const flushPendingReadyIds = useCallback(() => {
    const pendingIds = pendingReadyIdsRef.current;
    if (pendingIds.size === 0) {
      return;
    }

    pendingReadyIdsRef.current = new Set<string>();

    setReadySet((prev) => {
      let changed = false;
      const next = new Set(prev);

      for (const id of pendingIds) {
        if (next.has(id)) continue;
        next.add(id);
        changed = true;
      }

      return changed ? next : prev;
    });
  }, []);

  const scheduleReadyCommit = useCallback(() => {
    if (typeof window === "undefined") {
      flushPendingReadyIds();
      return;
    }

    if ((flushReadyRafRef.current !== null && flushReadyRafRef.current !== undefined)) {
      return;
    }

    flushReadyRafRef.current = window.requestAnimationFrame(() => {
      flushReadyRafRef.current = null;
      flushPendingReadyIds();
    });
  }, [flushPendingReadyIds]);

  useEffect(() => {
    const sigMap = signatureMapRef.current;
    const currentIds = new Set(
      cardCatalog.map((entry) => entry.id).filter(Boolean),
    );

    setReadySet((prev) => {
      let changed = false;
      const next = new Set(prev);

      for (const id of prev) {
        if (!currentIds.has(id)) {
          next.delete(id);
          sigMap.delete(id);
          changed = true;
        }
      }

      for (const entry of cardCatalog) {
        if (!entry.id) continue;

        const previousSignature = sigMap.get(entry.id);

        if (
          previousSignature !== undefined &&
          previousSignature !== entry.signature
        ) {
          next.delete(entry.id);
          changed = true;
        }

        sigMap.set(entry.id, entry.signature);

        if (!entry.hasImages && !next.has(entry.id)) {
          next.add(entry.id);
          changed = true;
        }
      }

      if (isDebug()) {
        const stats = getPreloadCacheStats();
        console.debug("[preloader] cards changed", {
          readySetSize: next.size,
          totalCards: cardCatalog.length,
          ...stats,
        });
      }

      return changed ? next : prev;
    });
  }, [cardCatalog]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && (flushReadyRafRef.current !== null && flushReadyRafRef.current !== undefined)) {
        window.cancelAnimationFrame(flushReadyRafRef.current);
        flushReadyRafRef.current = null;
      }

      pendingReadyIdsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (cards.length === 0) return;

    const controller = new AbortController();
    const { signal } = controller;

    const { eagerStart, eagerEnd, idleStart, idleEnd } = resolvePreloadWindow({
      cardsLength: cards.length,
      activeIndex,
      renderRange,
    });

    const markReady = (cardId: string) => {
      if (signal.aborted) return;

      if (readySetRef.current.has(cardId)) {
        return;
      }

      const pendingIds = pendingReadyIdsRef.current;
      if (pendingIds.has(cardId)) {
        return;
      }

      pendingIds.add(cardId);
      scheduleReadyCommit();
    };

    const preload = async (idx: number): Promise<void> => {
      const card = cards[idx];
      if (!card?.id) return;

      if (!cardHasImages(card)) {
        markReady(card.id);
        return;
      }

      await preloadCard(card, userId, signal);

      if (!signal.aborted) {
        if (isDebug()) {
          const stats = getPreloadCacheStats();
          console.debug(`[preloader] ready idx=${idx} id=${card.id}`, stats);
        }

        markReady(card.id);
      }
    };

    if (isDebug()) {
      console.debug("[preloader] effect start", {
        activeIndex,
        eagerStart,
        eagerEnd,
        idleStart,
        idleEnd,
        eagerCount: eagerEnd - eagerStart + 1,
        idleCount: idleEnd - idleStart + 1 - (eagerEnd - eagerStart + 1),
        ...getPreloadCacheStats(),
        blob: getBlobCacheStats(),
      });
    }

    const eagerIndices: number[] = [];
    for (let index = eagerStart; index <= eagerEnd; index += 1) {
      eagerIndices.push(index);
    }

    eagerIndices.sort(
      (left, right) =>
        Math.abs(left - activeIndex) - Math.abs(right - activeIndex),
    );

    let running = 0;
    let queuePos = 0;

    const runNextEager = () => {
      while (
        running < CARD_IMAGE_PRELOAD.maxEagerConcurrent &&
        queuePos < eagerIndices.length
      ) {
        const idx = eagerIndices[queuePos++];
        running += 1;

        void preload(idx).finally(() => {
          running -= 1;
          runNextEager();
        });
      }
    };

    runNextEager();

    const ric = getRequestIdleCallback();
    const cic = getCancelIdleCallback();
    const idleHandles: IdleHandle[] = [];

    for (let index = idleStart; index <= idleEnd; index += 1) {
      if (index >= eagerStart && index <= eagerEnd) continue;

      if (ric) {
        idleHandles.push(ric(() => void preload(index), { timeout: 3000 }));
      } else {
        idleHandles.push(
          setTimeout(() => void preload(index), 80 + (index - idleStart) * 10),
        );
      }
    }

    return () => {
      controller.abort();

      if (typeof window !== "undefined" && (flushReadyRafRef.current !== null && flushReadyRafRef.current !== undefined)) {
        window.cancelAnimationFrame(flushReadyRafRef.current);
        flushReadyRafRef.current = null;
      }

      for (const handle of idleHandles) {
        if (cic) {
          cic(handle);
        } else {
          clearTimeout(handle as ReturnType<typeof setTimeout>);
        }
      }

      flushPendingReadyIds();
    };
  }, [
    activeIndex,
    cards,
    flushPendingReadyIds,
    preloadPlanSignature,
    renderRange,
    scheduleReadyCommit,
    userId,
  ]);

  return readySet;
};



export { cardHasImages, useCardImagePreloader };
