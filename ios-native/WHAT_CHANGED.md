# WHAT_CHANGED

この `ios-native` は、元の未統合な SwiftUI 断片を置き換えるために再構築したスタンドアロン版です。

## 実装済み
- TabView ベースの 4 タブ構成
- Folder / Card Set / Card / Tag の CRUD
- カード詳細表示
- 全文検索
- ステータス絞り込み
- タグ絞り込み
- ローカル JSON 永続化
- スナップショット export / import
- テーマ切替
- Xcode プロジェクト同梱

## 意図的に外したもの
- Firebase / Google Sign-In
- クラウド同期
- 外部 SDK 依存

## 理由
上書きしてすぐ動く完成物を優先したためです。
まず単体アプリとして成立させ、その上で必要なら Firebase を別ブランチで戻す方が安全です。