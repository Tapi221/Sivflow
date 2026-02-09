。# ダッシュボード「今日の復習」カードの影をテーマカラーに変更する実装計画

## 目標
ダッシュボードの「今日の復習」カードの影（シャドウ）を、現在のデフォルトの黒系から、アプリケーションのテーマカラー（Primary Color）に基づいた色に変更し、視覚的な一体感を向上させる。

## 変更内容

### `src/Pages/Dashboard.jsx`

- 「今日の復習」セクションのカードコンテナ (`div`) のクラスを変更する。
- 現在の `shadow-xl` および `hover:shadow-2xl` を、カスタムのテーマカラー付きシャドウに変更する。
- Tailwind の `group-hover` や `hover` 疑似クラスを使用して、ホバー時の強調表現も維持する。

#### 具体的な変更

**変更前:**
```jsx
className="bg-[#FAFAFA] rounded-3xl md:rounded-[40px] py-6 px-6 md:p-12 border-t border-white/50 ring-1 ring-slate-900/5 shadow-xl cursor-pointer hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden relative"
```

**変更後 (案):**
```jsx
className="bg-[#FAFAFA] rounded-3xl md:rounded-[40px] py-6 px-6 md:p-12 border-t border-white/50 ring-1 ring-slate-900/5 shadow-[0_20px_50px_-12px_rgba(var(--color-primary-600),0.3)] cursor-pointer hover:shadow-[0_25px_60px_-12px_rgba(var(--color-primary-600),0.4)] hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden relative"
```
※ `rgba(var(--color-primary-600), 0.3)` のように CSS 変数を利用してテーマカラーを動的に適用する。

## 検証計画

1.  ダッシュボードを表示し、「今日の復習」カードの影がテーマカラー（通常はティールグリーン系）になっていることを確認する。
2.  カードにマウスホバーし、影が濃くなり、カードが浮き上がるアニメーションが正常に動作することを確認する。
3.  モバイル表示でも違和感がないか確認する。

## 追加変更: カード0枚時のデザイン変更

### `src/Pages/Dashboard.jsx` (追加)

- `todayCards.length` が 0 の場合（学習完了時）のスタイルを条件分岐で適用する。

#### 具体的な変更

**条件分岐ロジック:**
```jsx
// 学習完了かどうかを判定
const isComplete = todayCards.length === 0;

// ...

<div 
  className={`
    bg-[#FAFAFA] rounded-3xl md:rounded-[40px] py-6 px-6 md:p-12 border-t border-white/50 ring-1 ring-slate-900/5 
    transition-all duration-300 group overflow-hidden relative
    ${isComplete 
      ? 'shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.06)] bg-slate-100/50 scale-[0.99] cursor-default' // 凹みスタイル（インナーシャドウ、少し縮小、背景暗め）
      : 'shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1),0_15px_30px_-5px_rgba(var(--color-primary-600),0.3)] cursor-pointer hover:shadow-[0_25px_50px_-10px_rgba(0,0,0,0.15),0_20px_40px_-5px_rgba(var(--color-primary-600),0.4)] hover:-translate-y-0.5' // 通常スタイル（浮き上がり）
    }
  `}
  onClick={() => !isComplete && navigate(createPageUrl('study'))} // 0枚時はクリック無効化または別アクション
>
```
※ `isComplete` 時はカーソルを `default` にし、ホバーエフェクトを無効化、クリックイベントも制御する。また、内部のテキストなども少し薄くするなどの調整を行う可能性がある。
