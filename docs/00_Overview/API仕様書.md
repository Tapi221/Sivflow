# API仕様書

Flash Master で使用する API の仕様です。

## Firebase Authentication API

### 認証メソッド

#### Email / Password 認証

```typescript
// ログイン
import { signInWithEmailAndPassword } from 'firebase/auth';

signInWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    const user = userCredential.user;
  })
  .catch((error) => {
    // エラーハンドリング
  });

// 新規登録
import { createUserWithEmailAndPassword } from 'firebase/auth';

createUserWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    const user = userCredential.user;
  });

// メール認証送信
import { sendEmailVerification } from 'firebase/auth';

sendEmailVerification(user)
  .then(() => {
    // メール送信完了
  });

// パスワードリセット
import { sendPasswordResetEmail } from 'firebase/auth';

sendPasswordResetEmail(auth, email)
  .then(() => {
    // メール送信完了
  });
```

#### OAuth 認証（Google）

```typescript
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const provider = new GoogleAuthProvider();
signInWithPopup(auth, provider)
  .then((result) => {
    const user = result.user;
  });
```

---

## Firestore API

### コレクション構造

#### users/{userId}

```typescript
interface User {
  userId: string;
  email: string;
  displayName?: string;
  profileImageUrl?: string;
  authMethods: ('email' | 'google' | 'apple' | 'microsoft')[];
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  isSuspended?: boolean;
  plan: 'free' | 'pro';
  baseQuotaMB: number;
  extraQuotaMB: number;
  usedQuotaMB: number;
}
```

#### userSettings/{userId}

```typescript
interface UserSettings {
  userSettingId: string;
  userId: string;
  weekStartDay: 'sunday' | 'monday';
  language: 'ja' | 'en' | 'zh';
  theme: 'light' | 'dark' | 'system';
  accentColor: string; // hex
  levelColors: { [level: number]: string }; // hex array
  notificationsEnabled: boolean;
  notificationMethods: ('browser' | 'email' | 'line')[];
  notificationTimes: { [dayOfWeek: number]: string }; // HH:MM
  dayStartTime: string; // HH:MM
  soundEnabled: boolean;
  correctSound: boolean;
  incorrectSound: boolean;
  clickSound: boolean;
  soundVolume: number; // 0-100
  levelDownBehavior: 'decrement' | 'maintain';
  autoResetDaysThreshold: number;
  completionLevelThreshold: number;
  swipeLoopMode: boolean;
  updatedAt: Timestamp;
}
```

#### userStats/{userId}

```typescript
interface UserStats {
  userId: string; // documentId と一致
  totalStudyCount: number;
  todayStudyCount: number;
  weeklyStudyCount: number;
  totalCorrectCount: number;
  totalIncorrectCount: number;
  accuracyRate: number; // 正答率（%）
  lastStudyAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### shareLinks/{shareLinkId}

```typescript
interface ShareLink {
  shareLinkId: string;
  sharedFolderId: string;
  ownerUserId: string;
  shareMethod: 'email' | 'line' | 'twitter' | 'link' | 'qrcode';
  shareUrl: string; // UUID-based obscured URL
  qrCodeUrl?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp; // デフォルト: +30 days
  isActive: boolean;
  accessCount: number;
}
```

#### sharedFolders/{sharedFolderId}

```typescript
interface SharedFolder {
  sharedFolderId: string;
  originalFolderId: string;
  originalOwnerUserId: string;
  importedByUserId: string;
  importedAt: Timestamp;
  folderSnapshot: object; // 完全なフォルダ + カードデータ（インポート時点）
}
```

#### loginHistory/{loginHistoryId}

```typescript
interface LoginHistory {
  loginHistoryId: string;
  userId: string;
  loginDate: string; // YYYY-MM-DD
  isConsecutive: boolean;
  consecutiveDays: number;
}
```

### 基本的な CRUD 操作

#### 読み取り

```typescript
import { doc, getDoc } from 'firebase/firestore';

const docRef = doc(db, 'users', userId);
const docSnap = await getDoc(docRef);

if (docSnap.exists()) {
  const data = docSnap.data();
} else {
  // ドキュメントが存在しない
}
```

#### リアルタイムリスナー

```typescript
import { doc, onSnapshot } from 'firebase/firestore';

const unsub = onSnapshot(doc(db, 'userStats', userId), (doc) => {
  const data = doc.data();
  // データが更新されるたびに実行される
});

// リスナーを解除
unsub();
```

#### 書き込み

```typescript
import { doc, setDoc, updateDoc } from 'firebase/firestore';

// ドキュメントを作成・上書き
await setDoc(doc(db, 'userSettings', userId), {
  theme: 'dark',
  language: 'ja',
  // ...
});

// フィールドを更新
await updateDoc(doc(db, 'userSettings', userId), {
  theme: 'light',
});
```

#### 削除

```typescript
import { doc, deleteDoc } from 'firebase/firestore';

await deleteDoc(doc(db, 'shareLinks', shareLinkId));
```

---

## Firebase Storage API

### ファイルアップロード

```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// アップロード
const storageRef = ref(storage, `users/${userId}/images/${imageId}`);
await uploadBytes(storageRef, file);

// ダウンロードURL取得
const downloadURL = await getDownloadURL(storageRef);
```

### ファイル削除

```typescript
import { ref, deleteObject } from 'firebase/storage';

const storageRef = ref(storage, `users/${userId}/images/${imageId}`);
await deleteObject(storageRef);
```

---

## Cloud Functions API

### 統計更新API

#### エンドポイント

- パス: `/api/stats/update`
- メソッド: POST
- 認証: Firebase Authentication ID トークン必須

#### リクエストボディ

```typescript
interface StatsUpdateRequest {
  userId: string; // request.auth.uid と一致
  date: string; // YYYY-MM-DD
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
}
```

#### レスポンス

```typescript
interface StatsUpdateResponse {
  success: boolean;
  updatedAt: Timestamp;
}
```

#### 使用例

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const updateStats = httpsCallable(functions, 'updateStats');

const result = await updateStats({
  userId: currentUser.uid,
  date: '2026-01-13',
  correctCount: 10,
  incorrectCount: 3,
  skippedCount: 1,
});
```

### 通知スケジューリング（内部API）

通知スケジューリングは Cloud Functions の Pub/Sub トリガーで実行されます。  
クライアントから直接呼び出す API はありません。

---

## クラウドストレージ連携 API（将来実装）

### Google Drive API

```typescript
// OAuth 認証
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?
  client_id=${CLIENT_ID}&
  redirect_uri=${REDIRECT_URI}&
  response_type=code&
  scope=https://www.googleapis.com/auth/drive.file`;

// ファイルアップロード
const fileMetadata = {
  name: 'folder.json',
  parents: [folderId],
};
const media = {
  mimeType: 'application/json',
  body: fileStream,
};
const file = await drive.files.create({
  resource: fileMetadata,
  media: media,
  fields: 'id',
});
```

### Dropbox API / OneDrive API

同様の OAuth 認証フローを実装。

---

## エラーハンドリング

### Firebase エラーコード

```typescript
import { FirebaseError } from 'firebase/app';

try {
  // Firebase 操作
} catch (error) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/user-not-found':
        // ユーザーが見つからない
        break;
      case 'auth/wrong-password':
        // パスワードが間違っている
        break;
      case 'permission-denied':
        // 権限が不足している
        break;
      default:
        // その他のエラー
    }
  }
}
```

---

## セキュリティルール

### Firestore セキュリティルール例

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザー認証状態チェック
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    match /userSettings/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    match /userStats/{userId} {
      allow read: if request.auth.uid == userId;
      // write は Cloud Functions のみ許可
    }
    
    match /shareLinks/{shareLinkId} {
      allow read: if 
        request.auth.uid == resource.data.ownerUserId;
      allow create: if request.auth.uid == request.resource.data.ownerUserId;
      allow update, delete: if request.auth.uid == resource.data.ownerUserId;
    }
  }
}
```

---

最終更新: 2026-01-13
