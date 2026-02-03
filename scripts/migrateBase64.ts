/**
 * 既存データの Base64 検出・移行スクリプト
 * 
 * 用途:
 * - DB内の Base64 混入を検出
 * - Base64 を localUrl に移動し、remoteUrl を null に設定
 * - 次回同期時に自動アップロード
 */

import { LocalDB, initializeDB, getLocalDb } from '../src/services/localDB';
import { isBase64DataUrl } from '../src/types/branded';

interface MigrationResult {
  totalCards: number;
  cardsWithBase64: number;
  imagesFixed: number;
  errors: string[];
}

export async function detectAndMigrateBase64(userId: string): Promise<MigrationResult> {
  initializeDB(userId);
  const db = getLocalDb();
  const result: MigrationResult = {
    totalCards: 0,
    cardsWithBase64: 0,
    imagesFixed: 0,
    errors: []
  };

  try {
    const cards = await db.cards.toArray();
    result.totalCards = cards.length;

    for (const card of cards) {
      let cardModified = false;

      // questionImages のチェック
      if (card.questionImages) {
        for (let i = 0; i < card.questionImages.length; i++) {
          const image = card.questionImages[i];
          
          // remoteUrl に Base64 が混入している場合
          if (image.remoteUrl && isBase64DataUrl(image.remoteUrl as string)) {
            console.warn(`[Migration] Base64 detected in card ${card.id}, questionImages[${i}].remoteUrl`);
            
            // Base64 を localUrl に移動（一時的な措置）
            card.questionImages[i] = {
              ...image,
              localUrl: null, // Base64 は破棄（再アップロードが必要）
              remoteUrl: null,
              status: 'failed' as const,
              uploadState: 'failed' as const
            };
            
            cardModified = true;
            result.imagesFixed++;
          }

          // localUrl に Base64 が混入している場合
          if (image.localUrl && isBase64DataUrl(image.localUrl as string)) {
            console.warn(`[Migration] Base64 detected in card ${card.id}, questionImages[${i}].localUrl`);
            
            card.questionImages[i] = {
              ...image,
              localUrl: null, // Base64 は破棄
              status: 'failed' as const,
              uploadState: 'failed' as const
            };
            
            cardModified = true;
            result.imagesFixed++;
          }
        }
      }

      // answerImages のチェック
      if (card.answerImages) {
        for (let i = 0; i < card.answerImages.length; i++) {
          const image = card.answerImages[i];
          
          if (image.remoteUrl && isBase64DataUrl(image.remoteUrl as string)) {
            console.warn(`[Migration] Base64 detected in card ${card.id}, answerImages[${i}].remoteUrl`);
            
            card.answerImages[i] = {
              ...image,
              localUrl: null,
              remoteUrl: null,
              status: 'failed' as const,
              uploadState: 'failed' as const
            };
            
            cardModified = true;
            result.imagesFixed++;
          }

          if (image.localUrl && isBase64DataUrl(image.localUrl as string)) {
            console.warn(`[Migration] Base64 detected in card ${card.id}, answerImages[${i}].localUrl`);
            
            card.answerImages[i] = {
              ...image,
              localUrl: null,
              status: 'failed' as const,
              uploadState: 'failed' as const
            };
            
            cardModified = true;
            result.imagesFixed++;
          }
        }
      }

      if (cardModified) {
        result.cardsWithBase64++;
        await db.cards.update(card.id, {
          questionImages: card.questionImages,
          answerImages: card.answerImages,
          updatedAt: new Date()
        });
      }
    }

    console.log('[Migration] Complete:', result);
    return result;

  } catch (error) {
    console.error('[Migration] Error:', error);
    result.errors.push(error instanceof Error ? error.message : String(error));
    return result;
  }
}

// CLI実行用
if (import.meta.url === `file://${process.argv[1]}`) {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: node migrateBase64.ts <userId>');
    process.exit(1);
  }

  detectAndMigrateBase64(userId)
    .then(result => {
      console.log('\n=== Migration Summary ===');
      console.log(`Total cards: ${result.totalCards}`);
      console.log(`Cards with Base64: ${result.cardsWithBase64}`);
      console.log(`Images fixed: ${result.imagesFixed}`);
      if (result.errors.length > 0) {
        console.log(`Errors: ${result.errors.length}`);
        result.errors.forEach(err => console.error(`  - ${err}`));
      }
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
