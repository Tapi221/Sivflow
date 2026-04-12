/**
 * Admin SDK 前提の Firestore 一括移行サンプル。
 * users/{uid}/cards/{cardId} の image block を assetId 参照へ変換する。
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const normalizeImageRefs = (raw: unknown) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!isRecord(item)) return null;
      const assetId = item.assetId ?? item.asset_id ?? item.id ?? null;
      if (typeof assetId !== "string" || assetId.trim().length === 0) return null;
      return {
        assetId: assetId.trim(),
        scale: typeof item.scale === "number" ? item.scale : null,
        x: typeof item.x === "number" ? item.x : null,
        naturalW: typeof item.naturalW === "number" ? item.naturalW : null,
        naturalH: typeof item.naturalH === "number" ? item.naturalH : null,
        layout: isRecord(item.layout)
          ? {
              baseWidthPx:
                typeof item.layout.baseWidthPx === "number" ? item.layout.baseWidthPx : null,
              cropX: typeof item.layout.cropX === "number" ? item.layout.cropX : null,
            }
          : null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
};

const migrateUserCards = async (serviceAccount: Record<string, unknown>, userId: string) => {
  initializeApp({
    credential: cert(serviceAccount as never),
  });

  const db = getFirestore();
  const cardsSnap = await db.collection(`users/${userId}/cards`).get();
  const batch = db.batch();

  cardsSnap.docs.forEach((cardDoc) => {
    const data = cardDoc.data() as Record<string, unknown>;
    const normalizeBlocks = (blocks: unknown) => {
      if (!Array.isArray(blocks)) return [];
      return blocks.map((block) => {
        if (!isRecord(block) || block.type !== "image") return block;
        return {
          ...block,
          images: normalizeImageRefs(block.images ?? []),
        };
      });
    };

    batch.set(
      cardDoc.ref,
      {
        front: {
          ...(isRecord(data.front) ? data.front : {}),
          blocks: normalizeBlocks(isRecord(data.front) ? data.front.blocks : []),
        },
        back: {
          ...(isRecord(data.back) ? data.back : {}),
          blocks: normalizeBlocks(isRecord(data.back) ? data.back.blocks : []),
        },
        updatedAt: new Date(),
      },
      { merge: true },
    );
  });

  await batch.commit();
};

export default migrateUserCards;
