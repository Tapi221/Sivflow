# FlashCardMaster iOS - Branding Guide

## 1. アプリロゴ

### 1.1 ロゴ仕様

- **ファイル名:** AppIcon.png
- **サイズ:** 1024x1024 px
- **形式:** PNG
- **背景:** グラデーション（深青 #0a7ea4 → 浅青 #4ECDC4）
- **デザイン:** フラッシュカードのスタック + ブックマーク + グロー効果
- **用途:** iOS App Store、アプリランチャー、設定画面

### 1.2 ロゴの配置

**Xcode での設定:**

1. Assets.xcassets を開く
2. AppIcon を選択
3. 以下のサイズでロゴを追加：
   - 1024x1024 (App Store)
   - 180x180 (iPhone)
   - 120x120 (iPhone)
   - 167x167 (iPad)
   - 152x152 (iPad)
   - その他の必要なサイズ

### 1.3 ロゴの使用ルール

- ✅ アプリランチャーに表示
- ✅ App Store に表示
- ✅ 設定アプリに表示
- ✅ ドキュメント・プレゼンテーションに使用
- ❌ 背景色を変更しない
- ❌ 比率を変更しない
- ❌ 回転・反転させない

## 2. カラーパレット

### 2.1 プライマリカラー

| 用途 | 色 | RGB | 用途 |
|------|-----|-----|------|
| プライマリ | #0a7ea4 | (10, 126, 164) | ボタン、ハイライト |
| セカンダリ | #4ECDC4 | (78, 205, 196) | アクセント、ホバー |
| サクセス | #22C55E | (34, 197, 94) | 成功状態、完了 |
| ワーニング | #F59E0B | (245, 158, 11) | 警告、注意 |
| エラー | #EF4444 | (239, 68, 68) | エラー、削除 |

### 2.2 ニュートラルカラー

| 用途 | ライト | ダーク |
|------|-------|-------|
| 背景 | #FFFFFF | #151718 |
| サーフェス | #F5F5F5 | #1E2022 |
| テキスト | #11181C | #ECEDEE |
| ミュート | #687076 | #9BA1A6 |
| ボーダー | #E5E7EB | #334155 |

### 2.3 ダークモード対応

すべてのカラーが自動的にダークモードに対応しています。

```swift
Color(UIColor { traitCollection in
    traitCollection.userInterfaceStyle == .dark
        ? UIColor(red: 0.1, green: 0.1, blue: 0.1, alpha: 1)
        : UIColor(red: 0.98, green: 0.98, blue: 0.98, alpha: 1)
})
```

## 3. タイポグラフィ

### 3.1 フォント選択

- **本体:** San Francisco（システムフォント）
- **見出し:** San Francisco Semibold
- **本文:** San Francisco Regular
- **キャプション:** San Francisco Regular

### 3.2 フォントサイズ

| 用途 | サイズ | ウェイト | 使用箇所 |
|------|-------|---------|---------|
| Title 1 | 34 | Semibold | ページタイトル |
| Title 2 | 28 | Semibold | セクションタイトル |
| Title 3 | 22 | Semibold | サブセクションタイトル |
| Headline | 17 | Semibold | リストアイテム |
| Body | 17 | Regular | 本文テキスト |
| Callout | 16 | Regular | 説明テキスト |
| Subheadline | 15 | Regular | サブテキスト |
| Caption 1 | 13 | Regular | キャプション |
| Caption 2 | 12 | Regular | 小さいキャプション |

### 3.3 行の高さ

- **見出し:** 1.2x フォントサイズ
- **本文:** 1.5x フォントサイズ
- **キャプション:** 1.4x フォントサイズ

## 4. アイコンガイドライン

### 4.1 アイコンスタイル

- **スタイル:** SF Symbols
- **サイズ:** 24pt（標準）
- **ウェイト:** Regular
- **カラー:** テーマカラーに準拠

### 4.2 よく使用されるアイコン

| アイコン | 用途 |
|---------|------|
| books.vertical | ライブラリ |
| magnifyingglass | 検索 |
| tag | タグ |
| gearshape | 設定 |
| plus | 追加 |
| pencil | 編集 |
| trash | 削除 |
| square.and.pencil | カード編集 |
| folder | フォルダ |
| square.stack.3d.up | カードセット |

## 5. スペーシング

### 5.1 スペーシングスケール

| トークン | サイズ | 用途 |
|---------|-------|------|
| xs | 4pt | 最小間隔 |
| sm | 8pt | 小間隔 |
| md | 16pt | 標準間隔 |
| lg | 24pt | 大間隔 |
| xl | 32pt | 特大間隔 |

### 5.2 使用例

```swift
VStack(spacing: AppSpacing.md) {
    Text("Title")
    Text("Subtitle")
}
.padding(AppSpacing.lg)
```

## 6. コーナーラジウス

### 6.1 ラジウスサイズ

| 用途 | サイズ | 例 |
|------|-------|-----|
| ボタン | 8pt | 小ボタン |
| カード | 12pt | コンテンツカード |
| モーダル | 16pt | シート、ダイアログ |
| 大型要素 | 20pt | 背景、セクション |

## 7. シャドウ

### 7.1 シャドウスタイル

| 用途 | Radius | Y Offset | Opacity |
|------|--------|----------|---------|
| 軽い | 2pt | 1pt | 0.1 |
| 標準 | 4pt | 2pt | 0.15 |
| 強い | 8pt | 4pt | 0.2 |

## 8. アニメーション

### 8.1 アニメーション時間

| 用途 | 時間 | イージング |
|------|------|-----------|
| 高速 | 0.15s | easeInOut |
| 標準 | 0.3s | easeInOut |
| 低速 | 0.5s | easeInOut |

### 8.2 よく使用されるアニメーション

```swift
// スムーズな遷移
Animation.easeInOut(duration: 0.3)

// カードフリップ
Animation.easeInOut(duration: 0.4)

// ズーム
Animation.easeInOut(duration: 0.2)
```

## 9. ボタンスタイル

### 9.1 プライマリボタン

- **背景:** プライマリカラー
- **テキスト:** ホワイト
- **コーナーラジウス:** 8pt
- **パディング:** 12pt (上下) × 16pt (左右)
- **最小高さ:** 44pt

### 9.2 セカンダリボタン

- **背景:** ボーダー
- **テキスト:** プライマリカラー
- **ボーダー:** 1pt プライマリカラー
- **コーナーラジウス:** 8pt

### 9.3 デストラクティブボタン

- **背景:** エラーカラー
- **テキスト:** ホワイト
- **コーナーラジウス:** 8pt

## 10. ブランディング要素

### 10.1 アプリ名

**正式名:** FlashCard Master

**短縮名:** FlashCard（App Store では "FlashCard Master" を使用）

### 10.2 スローガン

**スローガン:** "Master Any Subject Through Spaced Repetition"

### 10.3 ブランド値

- **学習:** 知識習得を支援
- **効率:** 時間を最大限活用
- **シンプル:** 使いやすいインターフェース
- **パワフル:** 高機能で拡張可能

## 11. コンテンツガイドライン

### 11.1 トーン・オブ・ボイス

- **親切:** ユーザーを支援する
- **明確:** 複雑さを排除
- **肯定的:** 励ましと動機付け
- **プロフェッショナル:** 信頼できる

### 11.2 ライティング

- 短く、簡潔に
- アクティブボイスを使用
- 専門用語を避ける
- ユーザーを「あなた」と呼ぶ

## 12. App Store 掲載情報

### 12.1 アプリ説明

**短い説明（30 文字以内）:**
"Master any subject with flashcards"

**詳細説明（4000 文字以内）:**
```
FlashCard Master は、スペース反復と能動的想起を通じて、
あらゆる主題を習得するための強力な学習ツールです。

主な機能：
• フォルダとカードセットで学習を整理
• リッチコンテンツカード（テキスト、画像、コード、数式）
• 複数の学習モード（カードビュー、フルードビュー）
• 全文検索とタグフィルタリング
• クラウド同期とバックアップ
• ダークモード対応
• オフライン対応

FlashCard Master で、効率的に学習を進めましょう。
```

### 12.2 キーワード

- flashcard
- learning
- study
- education
- memorization
- spaced repetition
- vocabulary
- exam preparation

### 12.3 スクリーンショット

1. **ライブラリ画面** — フォルダとカードセット
2. **カード詳細** — フリップとズーム機能
3. **検索** — 全文検索とフィルタリング
4. **タグ管理** — タグブラウザ
5. **設定** — テーマとデータ管理

## 13. チェックリスト

実装前に以下を確認してください：

- [ ] ロゴが Assets.xcassets に追加されている
- [ ] すべてのカラーがカラーパレットに準拠している
- [ ] タイポグラフィがシステムフォントを使用している
- [ ] スペーシングが AppSpacing トークンを使用している
- [ ] ボタンが最小 44x44 ポイント
- [ ] ダークモードが機能している
- [ ] アイコンが SF Symbols を使用している
- [ ] App Store 掲載情報が準備されている
- [ ] スクリーンショットが撮影されている
- [ ] ブランドガイドラインが遵守されている

## 14. リソース

- [Apple Design Resources](https://developer.apple.com/design/resources/)
- [SF Symbols](https://developer.apple.com/sf-symbols/)
- [iOS Design Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)
- [Color Accessibility](https://www.tpgi.com/color-contrast-checker/)
