# FlashCardMaster Native iOS MVP

このディレクトリは `FlashCard-Master` の将来的な iOS ネイティブ移行に向けた、SwiftUI ベースの read-only MVP 骨組みです。

## 現在のスコープ

- `Folder -> CardSet -> Card -> Detail` の最小ナビゲーション
- `sample-snapshot.json` を使った bundle import の足場
- JSON decode 失敗時は mock データへフォールバック
- `SnapshotDTO / FolderDTO / CardSetDTO / CardDTO / TagRecordDTO` の雛形

## 非対象

- Google Sign-In
- Firebase / syncQueue
- card edit
- IndexedDB 互換
- 既存 React / Electron UI の直接移植

## ディレクトリ構成

- `App/`: アプリ起動と bootstrap
- `Features/`: 画面群
- `Core/`: ドメインモデルと閲覧サービス
- `Persistence/`: DTO, loader, mapper, mock データ
- `DesignSystem/`: 最小の spacing / row / placeholder

## 起動方法

1. `ios-native/FlashCardMasterNative.xcodeproj` を Xcode で開く
2. Scheme `FlashCardMasterNative` を選択する
3. iOS Simulator を選び Build / Run する

CLI の例:

```bash
xcodebuild -project ios-native/FlashCardMasterNative.xcodeproj   -scheme FlashCardMasterNative   -destination 'platform=iOS Simulator,name=iPhone 15' build
```

## 補足

- `sample-snapshot.json` が decode できれば、その内容を表示します
- decode に失敗した場合は mock データで起動します
- このパッチは `ios-native/` の追加に閉じており、既存 Web / Desktop コードは変更しません
