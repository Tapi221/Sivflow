import { useGoogleLogin } from '@react-oauth/google';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { firestoreDb } from './firebase';
import { getLocalDb } from './localDB';
import { useAuth } from '../contexts/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/**
 * Google Drive認証フック
 */
export function useGoogleDriveAuth() {
  const { currentUser } = useAuth();

  const login = (useGoogleLogin as any)({
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    scope: 'https://www.googleapis.com/auth/drive.file',
    onSuccess: async (tokenResponse: any) => {
      if (!currentUser) return;
      
      try {
        // トークンをFirestoreに保存
        const tokenRef = doc(firestoreDb, 'userGoogleDriveTokens', currentUser.uid);
        await setDoc(tokenRef, {
          accessToken: tokenResponse.access_token,
          expiresAt: new Date(Date.now() + (tokenResponse.expires_in * 1000)),
          createdAt: new Date(),
        }, { merge: true });
        
        console.log('Google Drive認証成功');
      } catch (error) {
        console.error('トークン保存エラー:', error);
      }
    },
    onError: () => {
      console.error('Google Drive認証エラー');
    },
  });

  return { login };
}

/**
 * 保存されたGoogle Driveトークンを取得
 */
export async function getGoogleDriveToken(userId: string): Promise<string | null> {
  try {
    const tokenRef = doc(firestoreDb, 'userGoogleDriveTokens', userId);
    const tokenDoc = await getDoc(tokenRef);
    
    if (!tokenDoc.exists()) {
      return null;
    }
    
    const tokenData = tokenDoc.data();
    const expiresAt = tokenData.expiresAt?.toDate();
    
    // トークンが有効期限内かチェック
    if (expiresAt && expiresAt > new Date()) {
      return tokenData.accessToken;
    }
    
    return null;
  } catch (error) {
    console.error('トークン取得エラー:', error);
    return null;
  }
}

/**
 * フォルダをGoogle Driveにエクスポート
 */
export async function exportToGoogleDrive(folderId: string, accessToken: string): Promise<void> {
  try {
    const exportFunction = httpsCallable(functions, 'exportToGoogleDrive');
    await exportFunction({ folderId, accessToken });
  } catch (error) {
    console.error('Google Driveエクスポートエラー:', error);
    throw error;
  }
}
