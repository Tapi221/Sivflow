import { strictValidateBeforeSave } from '@/utils/imageValidation';
import type { UploadedImage } from '@/types';
import { firestoreDb } from '@/services/firebase';
import { getLocalDb } from '@/services/localDB';
import { doc, setDoc, getDoc, writeBatch } from 'firebase/firestore';

/**
 * DB保存の統一インターフェース（全パスで必須）
 * すべての画像DB保存はこのクラスを経由する
 */
class ImageDatabaseWriter {
  /**
   * Firestore への保存（必ずバリデーション経由）
   */
  async saveToFirestore(image: UploadedImage): Promise<void> {
    // 保存前に必ず厳格なバリデーション
    strictValidateBeforeSave(image);
    
    try {
      await setDoc(doc(firestoreDb, 'images', image.id), image);
      console.log(`[ImageDB] Saved to Firestore: ${image.id}`);
    } catch (error) {
      console.error('[ImageDB] Failed to save to Firestore', error);
      throw error;
    }
    
    // 本番環境でも異常検知（念のため二重チェック）
    if (import.meta.env.PROD) {
      if (image.remoteUrl?.includes('base64') || image.localUrl?.includes('base64')) {
        // Sentry に即座に報告 -> 未導入のためコンソール出力に変更
        console.error('[CRITICAL] Base64 detected in production', { image });
      }
    }
  }
  
  /**
   * IndexedDB への保存（必ずバリデーション経由）
   */
  async saveToIndexedDB(image: UploadedImage): Promise<void> {
    // 保存前に必ず厳格なバリデーション
    strictValidateBeforeSave(image);
    
    try {
      const db = await getLocalDb();
      await db.images.put(image);
      console.log(`[ImageDB] Saved to IndexedDB: ${image.id}`);
    } catch (error) {
      console.error('[ImageDB] Failed to save to IndexedDB', error);
      throw error;
    }
  }
  
  /**
   * バッチ処理（複数画像の一括保存）
   */
  async saveBatch(images: UploadedImage[]): Promise<void> {
    // バッチ処理でも個別にバリデーション
    for (const image of images) {
      strictValidateBeforeSave(image);
    }
    
    try {
      const batch = writeBatch(firestoreDb);
      images.forEach(image => {
        const ref = doc(firestoreDb, 'images', image.id);
        batch.set(ref, image);
      });
      await batch.commit();
      console.log(`[ImageDB] Batch saved ${images.length} images to Firestore`);
    } catch (error) {
      console.error('[ImageDB] Failed to batch save to Firestore', error);
      throw error;
    }
  }
  
  /**
   * Firestore から画像を取得
   */
  async getFromFirestore(imageId: string): Promise<UploadedImage | null> {
    try {
      const snapshot = await getDoc(doc(firestoreDb, 'images', imageId));
      if (!snapshot.exists()) {
        return null;
      }
      return snapshot.data() as UploadedImage;
    } catch (error) {
      console.error('[ImageDB] Failed to get from Firestore', error);
      throw error;
    }
  }
  
  /**
   * IndexedDB から画像を取得
   */
  async getFromIndexedDB(imageId: string): Promise<UploadedImage | null> {
    try {
      const db = await getLocalDb();
      const image = await db.images.get(imageId);
      return image || null;
    } catch (error) {
      console.error('[ImageDB] Failed to get from IndexedDB', error);
      throw error;
    }
  }
}

/**
 * 画像DB操作の統一インスタンス
 * すべての画像DB保存はこのインスタンスを経由する
 */
export const imageDB = new ImageDatabaseWriter();
