# 実装プラン: SettingsDialog のプロフィール画像表示の改善

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

## 影響範囲

- `src/components/settings/SettingsDialog.jsx`

## 確認事項

- [ ] オリジナルのプロフィール画像が設定されている場合に正しく表示されるか。
- [ ] オリジナルがない場合に Google のプロフィール画像が表示されるか。
- [ ] どちらもない場合にイニシャル（またはデフォルトアイコン）が表示されるか。
- [ ] 画像読み込みエラー時に正しくフォールバックするか。
