/**
 * useCardImagePreloader
 *
 * カード一覧の「表示前プリロード」を担うフック。
 *
 * 3 段階の優先度でプリロードを行う：
 *   EAGER  (±EAGER_RADIUS)  : activeIndex 周辺 → 即時解決 + decode
 *   IDLE   (±IDLE_RADIUS)   : それ以外の先読み範囲 → requestIdleCallback で低優先度
 *
 * 各カードの状態：
 *   dataReady      : cards[] に含まれている時点で常に true（Dexie はローカル DB）
 *   mediaReady     : 全画像 URL 解決 + Image.decode() 完了
 *   readyToDisplay : mediaReady || 画像なし
 *
 * 返り値：readyToDisplay な card.id の Set
 */

import { useEffect, useRef, useState } from "react";
import type { Card } from "@/types/domain/card";
import type { UploadedImage } from "@/types/domain/card";
import { getCardImages } from "@/domain/card/content";
import { getOrCreateImageBlobUrl } from "@/services/imageBlobUrlSessionCache";
import { getLocalDb } from "@/services/localDB";
import { storage } from "@/services/firebase";
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import {
  getCachedRemoteUrl,
  setCachedRemoteUrl,
  isUrlDecoded,
  markUrlDecoded,
  getPreloadCacheStats,
} from "@/services/imagePreloadCache";
import { getBlobCacheStats } from "@/services/imageBlobUrlSessionCache";

// ── デバッグフラグ ──────────────────────────────────────────────────────────
// localStorage.setItem("manifolmia_preload_debug", "1") でブラウザから有効化できる。
const isDebug = (): boolean =>
  typeof localStorage !== "undefined" &&
  localStorage.getItem("manifolmia_preload_debug") === "1";

// ── 定数 ───────────────────────────────────────────────────────────────────
/**
 * renderRange が渡された場合: renderRange を中心に ±EAGER_BUFFER 拡張した範囲を eager とする。
 * renderRange がない場合: activeIndex ±EAGER_RADIUS_FALLBACK を eager とする。
 *
 * EAGER_RADIUS_FALLBACK は VerticalCardPager.ACTIVE_INDEX_RENDER_RADIUS(=6) を超える値にする。
 * 「描画対象だが未プリロード」というケースをなくすため。
 */
const EAGER_RADIUS_FALLBACK = 8; // renderRange 未提供時のフォールバック
const EAGER_BUFFER = 2;          // renderRange の前後に積む先読みバッファ
const IDLE_EXTRA = 12;           // eager 範囲からさらに ±IDLE_EXTRA → idle プリロード
/**
 * eager プリロードのカード単位同時実行上限。
 * Firebase Storage の download URL 取得 + decode が並走しすぎると
 * 帯域を圧迫してアクティブカードの表示が遅延するため絞る。
 */
const MAX_EAGER_CONCURRENT = 5;

// ── ヘルパー ───────────────────────────────────────────────────────────────

function extractImages(card: Card): UploadedImage[] {
  const imgs: UploadedImage[] = [];
  imgs.push(...getCardImages(card, "question"));
  imgs.push(...getCardImages(card, "answer"));
  return imgs;
}

export function cardHasImages(card: Card): boolean {
  return extractImages(card).length > 0;
}

/**
 * カードの画像コンテンツを表す文字列シグネチャ。
 *
 * readySet は card.id をキーとするが、画像ブロックの追加/削除/差し替えが起きると
 * 旧シグネチャで ready 判定済みのエントリが stale になる。
 * このシグネチャを使って「画像内容が変わったカード」を検出し、readySet から除外する。
 *
 * 計算コストを最小にするため、URL 解決前の識別子（assetId > localFileId > remoteUrl > localUrl）
 * をカンマ結合するだけにする。hash は使わない。
 */
function cardImageSignature(card: Card): string {
  const imgs = extractImages(card);
  if (imgs.length === 0) return "";
  return imgs
    .map(
      (img) =>
        img.assetId ?? img.localFileId ?? img.remoteUrl ?? img.localUrl ?? "",
    )
    .join(",");
}

async function resolveImageUrl(
  img: UploadedImage,
  userId: string | null,
): Promise<string | null> {
  // 直接使える URL（blob 以外）があればそのまま使う
  for (const v of [img.remoteUrl, img.localUrl]) {
    if (typeof v === "string" && v.length > 0 && !v.startsWith("blob:")) {
      return v;
    }
  }

  const assetId = img.assetId ?? null;
  const localFileId = img.localFileId ?? assetId;

  // ローカル IndexedDB の blob
  if (localFileId) {
    const blobUrl = await getOrCreateImageBlobUrl(localFileId, {
      userId: userId ?? undefined,
    });
    if (blobUrl) return blobUrl;
  }

  // Firebase Storage（assetId がある場合）
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
}

async function decodeUrl(url: string): Promise<void> {
  if (isUrlDecoded(url)) return;
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
  } catch {
    // decode 失敗でも「済み」にして無限リトライを防ぐ
  }
  markUrlDecoded(url);
}

async function preloadCard(
  card: Card,
  userId: string | null,
  signal: AbortSignal,
): Promise<void> {
  const images = extractImages(card);
  await Promise.all(
    images.map(async (img) => {
      if (signal.aborted) return;
      const url = await resolveImageUrl(img, userId);
      if (!url || signal.aborted) return;
      await decodeUrl(url);
    }),
  );
}

// ── フック ─────────────────────────────────────────────────────────────────

type IdleHandle = ReturnType<typeof setTimeout>;

export function useCardImagePreloader(
  cards: Card[],
  activeIndex: number,
  userId: string | null,
  /**
   * VerticalCardPager が実際にDOMレンダリングしている範囲。
   * 提供されるとこの範囲 ±EAGER_BUFFER が eager プリロード対象になり、
   * 「描画済みだが未プリロード」によるスケルトン表示を防ぐ。
   */
  renderRange?: { start: number; end: number } | null,
): Set<string> {
  // renderRange はスクロール中に高頻度で変化するため、main effect の deps に含めると
  // AbortController が毎回破棄・再生成されてプリロードが abort/restart を繰り返す。
  // ref 経由で参照することで effect の再実行を activeIndex 変化時のみに限定する。
  const renderRangeRef = useRef(renderRange);
  renderRangeRef.current = renderRange;

  const [readySet, setReadySet] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const card of cards) {
      if (!card.id) continue;
      if (!cardHasImages(card)) s.add(card.id);
    }
    return s;
  });

  /**
   * cardId → cardImageSignature のマップ。
   * cards 配列が更新されたとき、シグネチャが変化したカードを readySet から除外する。
   *
   * なぜ ref か:
   *   - state にするとシグネチャ更新のたびに余分な再レンダーが発生する。
   *   - このマップは「invalidation の判定」にしか使わないため、
   *     レンダーに影響させる必要はない。
   */
  const signatureMapRef = useRef<Map<string, string>>(new Map());

  // カードリストが変わったとき:
  //   1. 画像が変化したカードを readySet から除外（stale ready を防ぐ）
  //   2. 画像なしカードは即 ready に追加
  //   3. シグネチャマップを最新に同期
  const prevCardsRef = useRef(cards);
  useEffect(() => {
    if (prevCardsRef.current === cards) return;
    prevCardsRef.current = cards;

    const sigMap = signatureMapRef.current;
    const currentIds = new Set(cards.map((c) => c.id).filter(Boolean) as string[]);

    setReadySet((prev) => {
      let changed = false;
      const next = new Set(prev);

      // ── 削除されたカードを readySet から除外 ──────────────────────────
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
          // ── 画像内容が変化 → stale ready を除外 ──────────────────────
          // 理由: 旧シグネチャで preload 済みの URL は既に decode キャッシュに残るが、
          //   新しい画像は未 preload のため readyToDisplay=true のまま表示すると
          //   本画像のない状態で描画される可能性がある。
          next.delete(card.id);
          changed = true;
        }

        // シグネチャを常に最新に更新
        sigMap.set(card.id, newSig);

        // 画像なしカードは即 ready
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

    // renderRange が提供されていればそれを基準に、なければ activeIndex ± fallback
    // renderRange は ref 経由で参照（deps には含めない）。
    const currentRenderRange = renderRangeRef.current;
    const eagerStart = currentRenderRange
      ? Math.max(0, currentRenderRange.start - EAGER_BUFFER)
      : Math.max(0, activeIndex - EAGER_RADIUS_FALLBACK);
    const eagerEnd = currentRenderRange
      ? Math.min(cards.length - 1, currentRenderRange.end + EAGER_BUFFER)
      : Math.min(cards.length - 1, activeIndex + EAGER_RADIUS_FALLBACK);
    const idleStart = Math.max(0, eagerStart - IDLE_EXTRA);
    const idleEnd = Math.min(cards.length - 1, eagerEnd + IDLE_EXTRA);

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
      // hit: readySet に既に入っていて、かつシグネチャも一致していれば再 preload 不要。
      // ただし signatureMapRef は effects の外から参照するため、ここでは readySet の
      // 最新 state は直接読めない。代わりに preloadCard 内部が decode キャッシュを
      // 参照するため、二重 preload は decode をスキップするだけで安全。
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

    // Eager: 同時実行上限付きキュー
    // activeIndex に近い順（中央から外側へ）に処理して表示カードを優先する。
    const eagerIndices: number[] = [];
    for (let i = eagerStart; i <= eagerEnd; i++) eagerIndices.push(i);
    eagerIndices.sort(
      (a, b) => Math.abs(a - activeIndex) - Math.abs(b - activeIndex),
    );

    let running = 0;
    let queuePos = 0;
    const runNextEager = () => {
      while (running < MAX_EAGER_CONCURRENT && queuePos < eagerIndices.length) {
        const idx = eagerIndices[queuePos++];
        running++;
        void preload(idx).finally(() => {
          running--;
          runNextEager();
        });
      }
    };
    runNextEager();

    // Idle: 低優先度
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
    for (let i = idleStart; i <= idleEnd; i++) {
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
      for (const h of idleHandles) {
        if (cic) cic(h);
        else clearTimeout(h as ReturnType<typeof setTimeout>);
      }
    };
  }, [cards, activeIndex, userId]);

  return readySet;
}

