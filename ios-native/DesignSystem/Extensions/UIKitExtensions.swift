import SwiftUI
import UIKit

// MARK: - Color Extensions

extension Color {
    /// システムカラーを使用した初期化
    static let adaptiveBackground = Color(UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark
            ? UIColor(red: 0.1, green: 0.1, blue: 0.1, alpha: 1)
            : UIColor(red: 0.98, green: 0.98, blue: 0.98, alpha: 1)
    })
    
    static let adaptiveSurface = Color(UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark
            ? UIColor(red: 0.15, green: 0.15, blue: 0.15, alpha: 1)
            : UIColor(red: 1, green: 1, blue: 1, alpha: 1)
    })
    
    static let adaptiveText = Color(UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark
            ? .white
            : .black
    })
    
    static let adaptiveSecondaryText = Color(UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark
            ? UIColor(red: 0.8, green: 0.8, blue: 0.8, alpha: 1)
            : UIColor(red: 0.6, green: 0.6, blue: 0.6, alpha: 1)
    })
}

// MARK: - View Extensions

extension View {
    /// iOS ガイドライン準拠のカード スタイル
    func cardStyle(
        backgroundColor: Color = Color(.secondarySystemBackground),
        cornerRadius: CGFloat = 12,
        shadowRadius: CGFloat = 4
    ) -> some View {
        self
            .padding(AppSpacing.md)
            .background(backgroundColor)
            .cornerRadius(cornerRadius)
            .shadow(radius: shadowRadius, y: 2)
    }
    
    /// アクセシビリティ対応のタップターゲット（最小 44x44 pt）
    func accessibleTapTarget() -> some View {
        self
            .frame(minHeight: 44)
            .contentShape(Rectangle())
    }
    
    /// ダークモード対応のテキストスタイル
    func darkModeAwareText() -> some View {
        self
            .foregroundStyle(Color.adaptiveText)
    }
    
    /// ローディング状態を表示
    @ViewBuilder
    func withLoadingOverlay(_ isLoading: Bool) -> some View {
        ZStack {
            self
            
            if isLoading {
                Color.black.opacity(0.3)
                    .ignoresSafeArea()
                
                ProgressView()
                    .tint(.white)
            }
        }
    }
    
    /// エラー状態を表示
    @ViewBuilder
    func withErrorAlert(_ error: Binding<String?>) -> some View {
        self
            .alert("Error", isPresented: Binding(
                get: { error.wrappedValue != nil },
                set: { if !$0 { error.wrappedValue = nil } }
            )) {
                Button("OK", role: .cancel) {}
            } message: {
                if let errorMessage = error.wrappedValue {
                    Text(errorMessage)
                }
            }
    }
}

// MARK: - Text Extensions

extension Text {
    /// iOS ガイドライン準拠のヘッドラインスタイル
    static func headline(_ text: String) -> Text {
        Text(text)
            .font(.headline.weight(.semibold))
            .foregroundStyle(.primary)
    }
    
    /// iOS ガイドライン準拠のボディスタイル
    static func body(_ text: String) -> Text {
        Text(text)
            .font(.body)
            .foregroundStyle(.primary)
    }
    
    /// iOS ガイドライン準拠のキャプションスタイル
    static func caption(_ text: String) -> Text {
        Text(text)
            .font(.caption)
            .foregroundStyle(.secondary)
    }
}

// MARK: - Button Extensions

extension Button {
    /// iOS ガイドライン準拠のプライマリボタン
    func primaryButtonStyle() -> some View {
        self
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
    }
    
    /// iOS ガイドライン準拠のセカンダリボタン
    func secondaryButtonStyle() -> some View {
        self
            .buttonStyle(.bordered)
            .controlSize(.regular)
    }
    
    /// アクセシビリティ対応のボタン
    func accessibleButton() -> some View {
        self
            .frame(minHeight: 44)
            .contentShape(Rectangle())
    }
}

// MARK: - Haptic Feedback

class HapticFeedback {
    static let shared = HapticFeedback()
    
    private let impactFeedback = UIImpactFeedbackGenerator(style: .light)
    private let selectionFeedback = UISelectionFeedbackGenerator()
    private let notificationFeedback = UINotificationFeedbackGenerator()
    
    func impact(style: UIImpactFeedbackGenerator.FeedbackStyle = .light) {
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.impactOccurred()
    }
    
    func selection() {
        selectionFeedback.selectionChanged()
    }
    
    func notification(type: UINotificationFeedbackGenerator.FeedbackType) {
        notificationFeedback.notificationOccurred(type)
    }
}

// MARK: - Accessibility Modifiers

extension View {
    /// VoiceOver ラベルを追加
    func accessibilityLabel(_ label: String) -> some View {
        self.accessibility(label: Text(label))
    }
    
    /// VoiceOver ヒントを追加
    func accessibilityHint(_ hint: String) -> some View {
        self.accessibility(hint: Text(hint))
    }
    
    /// アクセシビリティ要素を非表示
    func accessibilityHidden(_ hidden: Bool = true) -> some View {
        self.accessibility(hidden: hidden)
    }
}

// MARK: - Animation Extensions

extension Animation {
    /// iOS ガイドライン準拠のスムーズなアニメーション
    static let smoothTransition = Animation.easeInOut(duration: 0.3)
    
    /// カード フリップ アニメーション
    static let cardFlip = Animation.easeInOut(duration: 0.4)
    
    /// ズーム アニメーション
    static let zoom = Animation.easeInOut(duration: 0.2)
}

// MARK: - Keyboard Extensions

extension View {
    /// キーボード を非表示にする
    func hideKeyboard() {
        UIApplication.shared.sendAction(
            #selector(UIResponder.resignFirstResponder),
            to: nil,
            from: nil,
            for: nil
        )
    }
}

// MARK: - Safe Area Extensions

extension View {
    /// Safe Area を考慮したパディング
    func safeAreaPadding(_ edges: Edge.Set = .all, _ length: CGFloat = AppSpacing.md) -> some View {
        self
            .padding(edges, length)
            .ignoresSafeArea(edges: edges)
    }
}

// MARK: - Device Detection

struct DeviceInfo {
    static var isSmallDevice: Bool {
        UIScreen.main.bounds.height < 700
    }
    
    static var isLargeDevice: Bool {
        UIScreen.main.bounds.height > 800
    }
    
    static var hasNotch: Bool {
        UIApplication.shared.windows.first?.safeAreaInsets.top ?? 0 > 20
    }
    
    static var isiPad: Bool {
        UIDevice.current.userInterfaceIdiom == .pad
    }
}

// MARK: - Responsive Layout

extension View {
    /// デバイスサイズに応じたレイアウト
    @ViewBuilder
    func responsiveLayout<Content: View>(
        @ViewBuilder smallDevice: () -> Content,
        @ViewBuilder largeDevice: () -> Content
    ) -> some View {
        if DeviceInfo.isSmallDevice {
            smallDevice()
        } else {
            largeDevice()
        }
    }
}

// MARK: - Image Extensions

extension Image {
    /// システムイメージをアクセシビリティ対応で表示
    func accessibleSystemImage(_ name: String, label: String) -> some View {
        Image(systemName: name)
            .accessibility(label: Text(label))
    }
}

// MARK: - List Extensions

extension List {
    /// iOS ガイドライン準拠のリストスタイル
    func defaultListStyle() -> some View {
        self
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background(Color(.systemBackground))
    }
}

// MARK: - Form Extensions

extension Form {
    /// iOS ガイドライン準拠のフォームスタイル
    func defaultFormStyle() -> some View {
        self
            .scrollContentBackground(.hidden)
            .background(Color(.systemBackground))
    }
}
