# 実装プラン: 設定ダイアログの整理とアカウントタブの削除

## 概要
設定ダイアログから「アカウント」タブを削除し、ユーザー情報の編集（名前、プロフィール画像）機能を廃止します。代わりに Firebase (Google) のプロフィール情報を優先的に表示するようにし、ダイアログのデフォルトタブを「学習設定」に変更します。

## 変更内容

### 1. SettingsDialog.jsx の大幅な整理
- 「アカウント」タブに関連する以下の要素を削除します：
  - `User`, `Camera`, `Calendar`, `ChevronRight` などの不要なアイコンインポート。
  - `Input` コンポーネント。
  - 画像アップロード関連のサービス (`uploadProfileImage`) およびユーティリティ (`isHeicFile`, `convertHeicToJpeg` 等)。
  - ユーザー名バリデーション関連のユーティリティ (`validateUsername` 等)。
  - `sidebarItems` から「アカウント」を削除。
  - プロフィール編集用の状態変数 (`uploadingImage`, `editingName` 等) と関数 (`handleImageUpload`, `handleNameSave` 等)。
  - `renderContent` 内の `case "account"` ブロック全体。
- デフォルトタブを `account` から `study` (学習設定) に変更します。
- `initialTab` が無効な場合に備え、`resolveSettingsTab` ヘルプ関数を追加します。

### 2. フッター（ユーザー情報）の表示ロジック改善
- 表示名を決定する優先順位を `currentUser.displayName` > `settings.displayName` > `"User"` とします。
- アバターの背景色やテキスト色を決定する際、この優先順位に基づいた名前を使用するように統合します。

### 3. アプリ全体でのデフォルトタブの統一
- `src/Layout.tsx` および `src/layout/Sidebar.tsx` において、設定を開く際の初期タブを `account` から `study` へ変更します。

## 影響範囲
- `src/components/settings/SettingsDialog.jsx`
- `src/Layout.tsx`
- `src/layout/Sidebar.tsx`

## 確認事項
- [ ] 設定ダイアログを開いた際、最初に「学習設定」が表示されるか。
- [ ] 「アカウント」タブがサイドバーから消えているか。
- [ ] 設定サイドバー下部のユーザー表示に Google の名前が正しく反映されているか。
- [ ] 不要なコードやインポートが綺麗に削除されているか。


## 概要

`SettingsDialog.jsx` において、ユーザーのプロフィール画像の表示ロジックを改善します。
保存されたプロフィール画像がない場合に、Google アカウントのプロフィール画像（`currentUser.photoURL`）をフォールバックとして使用するようにし、UI全体で一貫した表示を実現します。

## 変更内容

### 1. プロフィール画像解決ロジックの追加

- `SettingsDialog` コンポーネント内で以下の値を計算するようにします。
  - `storedProfileImageUrl`: 設定から取得したリモートURL。
  - `googleProfileImageUrl`: Firebase の `currentUser` から取得したプロフィール画像URL。
  - `resolvedProfileImageUrl`: 保存された画像があればそれを、なければ Google の画像を使用。
  - `hasResolvedProfileImage`: 有効な解決済み画像があるかどうかのフラグ。

### 2. 副作用の更新

- `currentUser?.photoURL` が変更された際にも `imgError` をリセットするように `useEffect` を更新します。

### 3. アカウントタブの UI 更新

- プロフィール編集エリアの画像表示を `resolvedProfileImageUrl` を使用するように変更。

### 4. フッター（ユーザー情報）の UI 更新

- サイドバーのフッター部分にあるユーザーアイコンを、イニシャル表示からプロフィール画像表示（ある場合）に変更します。

### 5. 各タブのヘッダーセクションの削除

- 各設定タブ（アカウント、タグ、音声、初期設定、テーマ、同期、データ、ショートカット）の冒頭にある冗長なタイトルとアイコンのブロックを削除し、UIをよりシンプルにします。

## 影響範囲

- `src/components/settings/SettingsDialog.jsx`

## 確認事項

- [ ] オリジナルのプロフィール画像が設定されている場合に正しく表示されるか。
- [ ] オリジナルがない場合に Google のプロフィール画像が表示されるか。
- [ ] どちらもない場合にイニシャル（またはデフォルトアイコン）が表示されるか。
- [ ] 画像読み込みエラー時に正しくフォールバックするか。
