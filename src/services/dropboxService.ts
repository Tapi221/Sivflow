import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/**
 * Dropboxにフォルダをエクスポート
 */
export async function exportToDropbox(folderId: string, accessToken: string): Promise<void> {
  try {
    const exportFunction = httpsCallable(functions, 'exportToDropbox');
    await exportFunction({ folderId, accessToken });
  } catch (error) {
    console.error('Dropboxエクスポートエラー:', error);
    throw error;
  }
}
