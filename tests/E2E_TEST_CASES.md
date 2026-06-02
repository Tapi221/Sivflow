## tests/e2e/card_layout_consistency.spec.ts

- [ ] デスクトップで表示用と編集用のシェル寸法が一致する
- [ ] モバイルで表示用と編集用のシェル寸法が一致する

## tests/e2e/codeblock_visual.spec.ts

- [ ] 表示枠と編集枠の見た目が安定している

## tests/e2e/pdf_text_selection.spec.ts

- [ ] テキストレイヤーで空ではない選択範囲を取得できる

## tests/e2e/sidebar_width_consistency.spec.ts

- [ ] デスクトップでエクスプローラータブを切り替えてもサイドバー幅が変わらない

## tests/e2e/sync_ui.spec.ts

- [ ] 成功状態を検証する
- [ ] エラー状態を検証する
- [ ] 競合状態が優先されることを検証する
- [ ] 折りたたみ詳細を検証する

## tests/e2e/handwriting_mode_visibility.spec.ts

- [ ] iPad では手書きモードの navigation と画面を表示する
- [ ] スマホでは手書きモードの navigation と画面を表示しない
- [ ] Desktop は Web renderer 上の Ink 表示・編集 UI を使用し、Tauri shell 側に UI を持たない

## tests/e2e/handwriting_session_flow.spec.ts

- [ ] Desktop で handwriting session を開始し、iPad から接続できる
- [ ] iPad PencilKit 入力を Ink document 形式として Desktop 表示に同期する
- [ ] session close / fail 状態を Desktop と iPad の両方で表示する
