/**
 * useCardImagePreloader
 *
 * カード一覧の「表示前プリロード」を担うフック。
 */

import {
  CARD_IMAGE_PRELOAD,
  CARD_IMAGE_PRELOAD_DEBUG_STORAGE_KEY,
} from "@constants/web/preload";
import { getCardImages } from "@/domain/card/content";
import { storage } from "@/services/firebase";
import { getOrCreateImageBlobUrl } from "@/services/imageBlobUrlSessionCache";
import { getBlobCacheStats } from "@/services/imageBlobUrlSessionCache";
import {
  getCachedRemoteUrl,
  getPreloadCacheStats,
  isUrlDecoded,
  markUrlDecoded,
  setCachedRemoteUrl,
} from "@/services/imagePreloadCache";
import { getLocalDb } from "@/services/localDB";
import type { Card, UploadedImage } from "@/types/domain/card";
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import { useEffect, useRef, useState } from "react";

const isDebug = (): boolean =>
  typeof localStorage !== "undefined" &&
  localStorage.getItem(CARD_IMAGE_PRELOAD_DEBUG_STORAGE_KEY) === "1";

const extractImages = (card: Card) => {
  const imgs: UploadedImage[] = [];
  imgs.push(...getCardImages(card, "question"));
  imgs.push(...getCardImages(card, "answer"));
  return imgs;
};

export const cardHasImages = (card: Card) => {
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
        | { remoteKey?: string }
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

type IdleHandle = ReturnType<typeof setTimeout>;

export const useCardImagePreloader = (
  cards: Card[],
  activeIndex: number,
  userId: string | null,
  renderRange?: { start: number; end: number } | null,
) => {
  const renderRangeRef = useRef(renderRange);
  renderRangeRef.current = renderRange;

  const [readySet, setReadySet] = useState<Set<string>>(() => {
    const next = new Set<string>();
    for (const card of cards) {
      if (!card.id) continue;
      if (!cardHasImages(card)) next.add(card.id);
    }
    return next;
  });

  const signatureMapRef = useRef<Map<string, string>>(new Map());

  const prevCardsRef = useRef(cards);
  useEffect(() => {
    if (prevCardsRef.current === cards) return;
    prevCardsRef.current = cards;

    const sigMap = signatureMapRef.current;
    const currentIds = new Set(
      cards.map((card) => card.id).filter(Boolean) as string[],
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

      for (const card of cards) {
        if (!card.id) continue;
        const newSig = cardImageSignature(card);
        const oldSig = sigMap.get(card.id);

        if (oldSig !== undefined && oldSig !== newSig) {
          next.delete(card.id);
          changed = true;
        }

        sigMap.set(card.id, newSig);

        if (!next.has(card.id) && newSig === "") {
          next.add(card.id);
          changed = true;
        }
      }

      if (isDebug()) {
        const stats = getPreloadCacheStats();
        console.debug("[preloader] cards changed", {
          readySetSize: next.size,
          totalCards: cards.length,
          ...stats,
        });
      }

      return changed ? next : prev;
    });
  }, [cards]);

  useEffect(() => {
    if (cards.length === 0) return;

    const controller = new AbortController();
    const { signal } = controller;
    const currentRenderRange = renderRangeRef.current;

    const eagerStart = currentRenderRange
      ? Math.max(0, currentRenderRange.start - CARD_IMAGE_PRELOAD.eagerBuffer)
      : Math.max(0, activeIndex - CARD_IMAGE_PRELOAD.eagerRadiusFallback);
    const eagerEnd = currentRenderRange
      ? Math.min(
          cards.length - 1,
          currentRenderRange.end + CARD_IMAGE_PRELOAD.eagerBuffer,
        )
      : Math.min(
          cards.length - 1,
          activeIndex + CARD_IMAGE_PRELOAD.eagerRadiusFallback,
        );
    const idleStart = Math.max(0, eagerStart - CARD_IMAGE_PRELOAD.idleExtra);
    const idleEnd = Math.min(
      cards.length - 1,
      eagerEnd + CARD_IMAGE_PRELOAD.idleExtra,
    );

    const markReady = (cardId: string) => {
      if (signal.aborted) return;
      setReadySet((prev) => {
        if (prev.has(cardId)) return prev;
        const next = new Set(prev);
        next.add(cardId);
        return next;
      });
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
    for (let i = eagerStart; i <= eagerEnd; i += 1) eagerIndices.push(i);
    eagerIndices.sort(
      (a, b) => Math.abs(a - activeIndex) - Math.abs(b - activeIndex),
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

    const ric =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? (
            window as unknown as {
              requestIdleCallback: (
                cb: () => void,
                opts?: { timeout: number },
              ) => IdleHandle;
            }
          ).requestIdleCallback
        : null;
    const cic =
      typeof window !== "undefined" && "cancelIdleCallback" in window
        ? (
            window as unknown as {
              cancelIdleCallback: (id: IdleHandle) => void;
            }
          ).cancelIdleCallback
        : null;

    const idleHandles: IdleHandle[] = [];
    for (let i = idleStart; i <= idleEnd; i += 1) {
      if (i >= eagerStart && i <= eagerEnd) continue;
      const idx = i;
      if (ric) {
        idleHandles.push(ric(() => void preload(idx), { timeout: 3000 }));
      } else {
        idleHandles.push(
          setTimeout(() => void preload(idx), 80 + (idx - idleStart) * 10),
        );
      }
    }

    return () => {
      controller.abort();
      for (const handle of idleHandles) {
        if (cic) cic(handle);
        else clearTimeout(handle as ReturnType<typeof setTimeout>);
      }
    };
  }, [cards, activeIndex, userId]);

  return readySet;
};
