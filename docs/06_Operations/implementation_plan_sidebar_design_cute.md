# サイドバーデザインの可愛化・丸み向上計画

設定画面およびメイン画面のサイドバーを、より丸みを持たせた親しみやすく「可愛らしい」デザインにアップデートします。

## Proposed Changes

### 1. 設定画面サイドバー (`SettingsDialog.jsx`)
- **丸みの向上**: `rounded-xl` から `rounded-2xl` または `rounded-3xl` に変更。
- **アクティブ状態の洗練**: 
    - 左側の太いボーダー (`md:border-l-4`) を廃止し、全体を包むカプセル状のデザインに変更。
    - 選択中のアイテムに柔らかな影 (`shadow-sm`) とアクセントカラーのリングを適用。
- **配置**: サイドバーの padding を調整し、アイテムが浮いているような「フローティング」感を演出。

### 2. メインサイドバー (`Layout.tsx`)
- **丸みの向上**: `rounded-xl` から `rounded-2xl` に変更。
- **ホバー・アクティブ表現**: 丸みを帯びた背景の変化をより強調。

## 修正ファイル
- [SettingsDialog.jsx](file:///c:/FlashcardMaster/src/Components/settings/SettingsDialog.jsx)
- [Layout.tsx](file:///c:/FlashcardMaster/src/Layout.tsx)

## Verification Plan

### Automated Tests
- 本件はデザイン変更（CSS/クラス名）が主であるため、ビルドエラーがないことを確認します。
```pwsh
npm run build
```

### Manual Verification
1. **設定画面の確認**:
    - サイドバーの各項目が丸みのあるボタンになっているか。
    - 選択中の項目が「カプセル」のように浮き上がって見えるか。
2. **メイン画面のサイドバー確認**:
    - アイコンボタンの角がより丸くなっているか。
