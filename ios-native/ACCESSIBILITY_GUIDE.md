# FlashCardMaster iOS - Accessibility Guide

このガイドは、アプリをアクセシビリティ対応にするための推奨事項を説明します。

## 1. VoiceOver サポート

### 1.1 アクセシビリティラベルの追加

すべてのインタラクティブ要素に `accessibilityLabel` を追加してください：

```swift
Button(action: { /* ... */ }) {
    Image(systemName: "plus")
}
.accessibilityLabel("Add new card")
```

### 1.2 アクセシビリティヒントの追加

複雑な操作には `accessibilityHint` を追加：

```swift
Button(action: { /* ... */ }) {
    Image(systemName: "arrow.left.arrow.right")
}
.accessibilityLabel("Flip card")
.accessibilityHint("Double tap to flip between front and back")
```

### 1.3 グループ化

関連する要素をグループ化：

```swift
VStack {
    Text("Card Title")
    Text("Question #1")
}
.accessibilityElement(children: .combine)
.accessibilityLabel("Card: Question #1")
```

## 2. Dynamic Type サポート

### 2.1 テキストスタイルの使用

固定サイズではなく、システムフォントスタイルを使用：

```swift
// ✅ Good
Text("Title")
    .font(.title2.weight(.semibold))

// ❌ Bad
Text("Title")
    .font(.system(size: 20, weight: .semibold))
```

### 2.2 行の高さの調整

ユーザーが Dynamic Type を使用している場合、行の高さを調整：

```swift
Text("Long text content")
    .lineSpacing(4)
    .lineLimit(nil)
```

### 2.3 最小タップターゲット

すべてのボタンが最小 44x44 ポイント：

```swift
Button(action: { /* ... */ }) {
    Text("Tap me")
}
.frame(minHeight: 44)
.contentShape(Rectangle())
```

## 3. カラーコントラスト

### 3.1 WCAG 準拠

テキストと背景のコントラスト比は最小 4.5:1：

```swift
// ✅ Good - 十分なコントラスト
Text("Content")
    .foregroundStyle(.black)
    .background(.white)

// ❌ Bad - コントラスト不足
Text("Content")
    .foregroundStyle(.gray)
    .background(.lightGray)
```

### 3.2 色に依存しない情報表示

色だけで情報を伝えない：

```swift
// ✅ Good - テキストと色の両方
HStack {
    Circle()
        .fill(.green)
    Text("Complete")
}

// ❌ Bad - 色だけ
Circle()
    .fill(.green)
```

## 4. Motion と Animation

### 4.1 Reduce Motion への対応

ユーザーが Motion を減らすよう設定している場合、アニメーションを無効化：

```swift
@Environment(\.accessibilityReduceMotion) var reduceMotion

var body: some View {
    ZStack {
        if isFrontShowing {
            FrontView()
                .transition(.opacity)
        } else {
            BackView()
                .transition(.opacity)
        }
    }
    .animation(
        reduceMotion ? nil : .easeInOut(duration: 0.3),
        value: isFrontShowing
    )
}
```

### 4.2 自動再生の無効化

ビデオや音声は自動再生しない：

```swift
// ✅ Good - ユーザーが再生を開始
Button(action: playAudio) {
    Label("Play", systemImage: "play.fill")
}

// ❌ Bad - 自動再生
.onAppear {
    playAudio()
}
```

## 5. テキストサイズの調整

### 5.1 ユーザー設定の尊重

アプリ内でテキストサイズ設定を提供：

```swift
@State private var fontSize: CGFloat = 16

Text("Content")
    .font(.system(size: fontSize))
```

### 5.2 最小フォントサイズ

最小フォントサイズは 12pt 以上：

```swift
Text("Small text")
    .font(.system(size: max(fontSize, 12)))
```

## 6. スクリーンリーダー テスト

### 6.1 VoiceOver の有効化

設定 > アクセシビリティ > VoiceOver > オン

### 6.2 テスト手順

1. VoiceOver を有効化
2. 各画面をスワイプして移動
3. ダブルタップでアクション実行
4. すべての要素が読み上げられることを確認

### 6.3 チェックリスト

- [ ] すべてのボタンにラベルがある
- [ ] すべてのアイコンに説明がある
- [ ] フォーム入力にラベルがある
- [ ] エラーメッセージが読み上げられる
- [ ] 重要な情報が色だけで表示されていない
- [ ] リンクが識別可能である
- [ ] 画像に代替テキストがある

## 7. キーボードナビゲーション

### 7.1 Tab キーでナビゲーション

すべてのインタラクティブ要素が Tab キーでアクセス可能：

```swift
Button(action: { /* ... */ }) {
    Text("Action")
}
.keyboardShortcut(.tab)
```

### 7.2 Return キーでアクション

フォーム送信は Return キーで実行：

```swift
TextField("Input", text: $input)
    .onSubmit(submitForm)
    .submitLabel(.return)
```

## 8. 実装例

### 8.1 アクセシビリティ対応のカード

```swift
VStack(alignment: .leading, spacing: AppSpacing.md) {
    Text(card.displayTitle)
        .font(.headline)

    Text("Question #\(card.questionNumber)")
        .font(.caption)
        .foregroundStyle(.secondary)

    Button(action: { /* ... */ }) {
        Label("Edit", systemImage: "pencil")
    }
}
.accessibilityElement(children: .combine)
.accessibilityLabel("Card: \(card.displayTitle)")
.accessibilityHint("Question #\(card.questionNumber). Double tap to edit.")
```

### 8.2 アクセシビリティ対応のリスト

```swift
List(cards) { card in
    HStack {
        VStack(alignment: .leading) {
            Text(card.displayTitle)
            Text("Q\(card.questionNumber)")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        Spacer()
        Image(systemName: "chevron.right")
    }
    .accessibilityElement(children: .combine)
    .accessibilityLabel("Card: \(card.displayTitle)")
    .accessibilityHint("Question #\(card.questionNumber)")
}
```

## 9. テスト ツール

### 9.1 Accessibility Inspector

Xcode > Window > Accessibility Inspector

- 要素のアクセシビリティ属性を検査
- コントラスト比を測定
- VoiceOver シミュレーション

### 9.2 Color Contrast Analyzer

- https://www.tpgi.com/color-contrast-checker/
- テキストと背景のコントラスト比を測定

## 10. ベストプラクティス

### 10.1 DO

- ✅ 意味のあるラベルを使用
- ✅ 十分なコントラスト比を確保
- ✅ 最小 44x44 ポイントのタップターゲット
- ✅ キーボードナビゲーションをサポート
- ✅ Dynamic Type をサポート
- ✅ VoiceOver をテスト
- ✅ Reduce Motion を尊重

### 10.2 DON'T

- ❌ 色だけで情報を伝える
- ❌ 小さすぎるタップターゲット
- ❌ 自動再生メディア
- ❌ アクセシビリティラベルなし
- ❌ 固定フォントサイズ
- ❌ キーボードナビゲーションなし
- ❌ 過度なアニメーション

## 11. リソース

- [Apple Accessibility](https://www.apple.com/accessibility/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [SwiftUI Accessibility](https://developer.apple.com/documentation/swiftui/accessibility)
- [iOS Accessibility](https://developer.apple.com/accessibility/ios/)

## 12. チェックリスト

実装前に以下を確認してください：

- [ ] VoiceOver ラベルが追加されている
- [ ] Dynamic Type がサポートされている
- [ ] コントラスト比が WCAG 準拠である
- [ ] タップターゲットが 44x44 ポイント以上
- [ ] キーボードナビゲーションが機能している
- [ ] Reduce Motion が尊重されている
- [ ] VoiceOver でテストされている
- [ ] Accessibility Inspector で検査されている
- [ ] 複数のデバイスでテストされている
- [ ] 異なるテキストサイズでテストされている
