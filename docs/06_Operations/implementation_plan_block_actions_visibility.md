# ブロック操作ボタンの表示最適化計画

## 概要
カード編集画面において、各ブロックの右側に表示される操作ボタン（並び替え、複製、削除）が常に表示されている、あるいは意図せず複数表示されて画面が煩雑に見える問題を解決します。
ホバーしているブロック、または現在入力中のブロックに対してのみ、これらのボタンを表示するように実装を強化します。

## 変更内容

### [MODIFY] [BlockWrapper.tsx](file:///c:/FlashcardMaster/src/Components/card/blocks/BlockWrapper.tsx)

アクションボタンのコンテナ（`absolute` 配置されている部分）のクラスを以下のように調整します：

- **デフォルト状態**: `opacity-0`, `invisible`, `pointer-events-none`, `scale-95` を適用し、完全に非表示かつ操作不能にします。
- **表示状態 (`group-hover` および `group-focus-within`)**: `opacity-100`, `visible`, `pointer-events-auto`, `scale-100` を適用します。
- **アニメーション**: `transition-all duration-200` により、フェードインおよびわずかなスケールアップのアニメーションを付与します。

```diff
- <div className="absolute -top-3 -right-1 md:-right-12 md:top-4 flex md:flex-col gap-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all z-20">
+ <div className="absolute -top-3 -right-1 md:-right-12 md:top-4 flex md:flex-col gap-1.5 opacity-0 invisible pointer-events-none scale-95 group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto group-focus-within:scale-100 transition-all duration-200 z-20">
```

## 検証計画

### 手動検証手順
1. カード編集画面を開きます。
2. **ホバー動作の確認**:
   - マウスを特定のブロックにかざした時、そのブロックの右側にのみボタンが表示されることを確認します。
   - マウスをブロックから外した際、ボタンがスムーズに消えることを確認します。
3. **フォーカス動作の確認**:
   - テキスト入力ブロックなどをクリックして入力状態（フォーカス）にします。
   - マウスを他の場所に動かしても、入力中のブロックのボタンが表示され続けていることを確認します。
   - 他のブロックをクリックした際、以前のブロックのボタンが消え、新しくフォーカスしたブロックのボタンが表示されることを確認します。
4. **表示の重なりの解消確認**:
   - 複数のブロックが並んでいる状態で、操作していないブロックのボタンが表示されず、画面がすっきりしていることを確認します。
