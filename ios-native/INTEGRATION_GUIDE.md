# FlashCardMaster iOS - Integration Guide

このガイドは、新規実装したスクリーンとサービスをアプリに統合するための手順を説明します。

## 1. ルートナビゲーションの更新

### 現在の構成

`StudyRootScreen.swift` は単一の `FolderListScreen` を表示しています。

### 更新手順

**1. AppTabNavigationView を使用するように更新**

`FlashCardMasterNativeApp.swift` を以下のように修正してください：

```swift
import SwiftUI

@main
struct FlashCardMasterNativeApp: App {
    @StateObject private var runtimeStore = StudyRuntimeStore.bootstrap()

    var body: some Scene {
        WindowGroup {
            AppTabNavigationView(runtimeStore: runtimeStore)
        }
    }
}
```

**2. StudyRootScreen は不要になります**

古い `StudyRootScreen` は削除するか、バックアップとして保持してください。

## 2. スクリーン統合チェックリスト

### ✅ 実装済みスクリーン

| スクリーン            | ファイル                         | 統合状態 | 備考                         |
| --------------------- | -------------------------------- | -------- | ---------------------------- |
| Library (Folder List) | `FolderListScreen.swift`         | 既存     | タブバーの "Library" に表示  |
| Search                | `SearchScreen.swift`             | 新規     | タブバーの "Search" に表示   |
| Tags                  | `TagBrowserScreen.swift`         | 新規     | タブバーの "Tags" に表示     |
| Settings              | `SettingsScreen.swift`           | 新規     | タブバーの "Settings" に表示 |
| Card Detail           | `CardDetailScreenEnhanced.swift` | 新規     | Library から遷移             |
| Card Edit             | `CardEditScreen.swift`           | 新規     | Card Detail から遷移         |
| Folder Management     | `FolderManagementScreen.swift`   | 新規     | Library から遷移             |

## 3. ナビゲーションフロー

```
AppTabNavigationView (タブバー)
├── Library Tab
│   ├── FolderListScreen
│   │   ├── FolderManagementScreen (新規フォルダ/カードセット)
│   │   ├── CardListScreen
│   │   │   └── CardDetailScreenEnhanced
│   │   │       ├── CardEditScreen (編集)
│   │   │       └── [削除確認]
│   │   └── [フォルダ削除確認]
│   └── [インポート/リセット メニュー]
│
├── Search Tab
│   └── SearchScreen
│       └── CardDetailScreenEnhanced
│
├── Tags Tab
│   ├── TagBrowserScreen
│   │   ├── NewTagSheet (新規作成)
│   │   ├── TagDetailScreen
│   │   │   ├── CardDetailScreenEnhanced
│   │   │   └── EditTagSheet
│   │   └── [タグ削除確認]
│   └── [タグ作成/編集]
│
└── Settings Tab
    ├── SettingsScreen
    ├── DataManagementScreen (エクスポート/インポート/削除)
    ├── DisplaySettingsScreen (表示設定)
    └── AboutScreen (アプリ情報)
```

## 4. 実装ステップ

### ステップ 1: ルートナビゲーション更新

```swift
// FlashCardMasterNativeApp.swift を更新
AppTabNavigationView(runtimeStore: runtimeStore)
```

### ステップ 2: 各スクリーンの確認

- すべてのスクリーンが正しくコンパイルされることを確認
- Mock データで各スクリーンが表示されることを確認

### ステップ 3: ナビゲーション接続

- タブ間のナビゲーションが機能することを確認
- スクリーン間の遷移が正しく動作することを確認

### ステップ 4: 機能実装

- Firebase 認証の実装
- データ永続化の実装
- クラウド同期の実装

## 5. Firebase 統合

### 5.1 Firebase SDK インストール

**CocoaPods を使用する場合：**

```bash
cd ios-native
pod install
```

**Podfile に以下を追加：**

```ruby
pod 'Firebase/Core'
pod 'Firebase/Auth'
pod 'Firebase/Firestore'
```

**SPM を使用する場合：**

Xcode で以下を追加：

- `https://github.com/firebase/firebase-ios-sdk.git`

### 5.2 GoogleService-Info.plist の設定

1. Firebase Console から `GoogleService-Info.plist` をダウンロード
2. Xcode プロジェクトに追加
3. Build Phases で "Copy Bundle Resources" に追加されていることを確認

### 5.3 Firebase 初期化

`FirebaseManager.swift` の `initialize()` メソッドを実装：

```swift
func initialize() async {
    do {
        FirebaseApp.configure()
        DispatchQueue.main.async {
            self.isInitialized = true
            self.initializationError = nil
        }
    } catch {
        DispatchQueue.main.async {
            self.isInitialized = false
            self.initializationError = error.localizedDescription
        }
    }
}
```

### 5.4 Google Sign-In 実装

`FirebaseManager.swift` に Google Sign-In ロジックを追加：

```swift
func signInWithGoogle() async throws -> User {
    // Google Sign-In の実装
    // 1. Google Sign-In SDK を初期化
    // 2. ユーザー認証
    // 3. Firebase Auth に登録
    // 4. User モデルを返す
}
```

## 6. データ永続化

### 6.1 ローカルストレージ

`CardEditScreen` と `FolderManagementScreen` の `saveCard()` と `createFolder()` メソッドを実装：

```swift
private func saveCard() {
    // 1. ローカルデータベースに保存
    // 2. Firebase に同期（オプション）
    // 3. UI を更新
}
```

### 6.2 Cloud Sync

`FirestoreService` を実装して、クラウド同期をサポート：

```swift
func uploadSnapshot(_ snapshot: StudySnapshot, userId: String) async throws {
    // Firestore にスナップショットをアップロード
}

func downloadSnapshot(userId: String) async throws -> StudySnapshot? {
    // Firestore からスナップショットをダウンロード
}
```

## 7. テスト

### 7.1 ユニットテスト

```swift
// CardSearchFilterTests.swift
import XCTest

class CardSearchFilterTests: XCTestCase {
    func testQueryMatching() {
        let filter = CardSearchFilter(query: "swift")
        let card = StudyCard(/* ... */)
        XCTAssertTrue(filter.matches(card: card))
    }
}
```

### 7.2 UI テスト

```swift
// CardDetailScreenUITests.swift
import XCTest

class CardDetailScreenUITests: XCTestCase {
    func testFlipAnimation() {
        let app = XCUIApplication()
        app.launch()

        let flipButton = app.buttons["Front"]
        flipButton.tap()

        XCTAssertTrue(app.staticTexts["Back"].exists)
    }
}
```

## 8. パフォーマンス最適化

### 8.1 検索最適化

`SearchScreen.swift` で検索をデバウンス：

```swift
private func performSearch(query: String) {
    // 既存のタイマーをキャンセル
    searchTimer?.invalidate()

    // 0.5秒後に検索を実行
    searchTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: false) { _ in
        // 検索実行
    }
}
```

### 8.2 画像キャッシング

`CardDetailScreenEnhanced.swift` で画像をキャッシュ：

```swift
private var imageCache = NSCache<NSString, UIImage>()

private func cachedImage(for url: URL) -> UIImage? {
    if let cached = imageCache.object(forKey: url.absoluteString as NSString) {
        return cached
    }
    return nil
}
```

## 9. iOS ガイドライン準拠

### 9.1 ダークモード

すべてのスクリーンが自動的にダークモードに対応しています。カスタム色を使用する場合は、以下のように定義してください：

```swift
Color(UIColor { traitCollection in
    traitCollection.userInterfaceStyle == .dark ? .white : .black
})
```

### 9.2 アクセシビリティ

すべてのボタンに `accessibilityLabel` を追加：

```swift
Button(action: { /* ... */ }) {
    Image(systemName: "plus")
}
.accessibilityLabel("Add new card")
```

### 9.3 Dynamic Type

テキストサイズを動的に調整：

```swift
Text("Title")
    .font(.title2.weight(.semibold))
    .lineLimit(nil)
```

## 10. デプロイメント準備

### 10.1 App Store 準備

1. App Store Connect でアプリを登録
2. Bundle ID を設定
3. 証明書と Provisioning Profile を設定
4. App Store Screenshots を作成
5. App Description を作成

### 10.2 TestFlight

```bash
# Archive をビルド
xcodebuild -scheme FlashCardMasterNative -configuration Release archive

# ipa をエクスポート
xcodebuild -exportArchive -archivePath build/FlashCardMasterNative.xcarchive \
  -exportOptionsPlist ExportOptions.plist -exportPath build/ipa
```

## 11. トラブルシューティング

### 問題: スクリーンが表示されない

**解決策:**

1. ナビゲーション設定を確認
2. Mock データが正しく設定されているか確認
3. Xcode ビルドログでエラーを確認

### 問題: Firebase 認証が失敗する

**解決策:**

1. `GoogleService-Info.plist` が正しく設定されているか確認
2. Firebase Console でプロジェクト設定を確認
3. ネットワーク接続を確認

### 問題: データが保存されない

**解決策:**

1. ローカルストレージの実装を確認
2. ファイルシステムの権限を確認
3. Xcode デバッガで変数を確認

## 12. 次のステップ

1. **Firebase 認証の完全実装**
   - Google Sign-In の実装
   - ユーザーセッション管理
   - トークン更新

2. **データ永続化**
   - Core Data または Realm の統合
   - ローカルデータベーススキーマ設計
   - マイグレーション戦略

3. **クラウド同期**
   - Firestore スキーマ設計
   - 同期キュー実装
   - 競合解決ロジック

4. **パフォーマンス最適化**
   - メモリ使用量の最適化
   - 画像キャッシング
   - リスト仮想化

5. **テスト**
   - ユニットテスト
   - UI テスト
   - 統合テスト

6. **App Store 提出**
   - TestFlight ベータテスト
   - App Review 準備
   - リリース

## 参考資料

- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [Firebase iOS SDK](https://firebase.google.com/docs/ios/setup)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [Xcode Help](https://help.apple.com/xcode)
