# FlashCardMaster iOS Native

`ios-native` の上書き用スタンドアロン版です。

## 含まれるもの
- SwiftUI ベースの iOS アプリ
- ライブラリ管理
- フォルダ / カードセット / カード / タグ CRUD
- 全文検索
- ステータス / タグ絞り込み
- ローカル JSON 永続化
- スナップショット export / import
- テーマ切替

## 開き方
1. `ios-native/FlashCardMasterNative.xcodeproj` を Xcode で開く
2. iOS 17 以上のシミュレータまたは実機を選ぶ
3. Build & Run

## 補足
- Firebase 依存は外しています
- まず単体で動く完成版を優先しています
- データは Application Support に `study-snapshot.json` として保存されます