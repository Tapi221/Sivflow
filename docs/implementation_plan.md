# カスタムタイトルバー実装計画

## 1. 調査結果
- Electronのメインプロセスからウィンドウを生成している箇所は `electron/main.ts` 。`createMainWindow`にて`BrowserWindow`のオプションを制御している。
- IPC通信層のブリッジは `electron/preload.ts` と `src/types/desktop-api.d.ts` で型安全に定義されている。
- アプリのReact側レイアウトは `src/Layout.tsx` にあり、ここが `h-[100dvh]` を持つ親要素としてアプリケーション全体を包括している。この内部に新造するカスタムタイトルバーを配置し、メインのビュー側 (`src/layout/AppLayout.tsx`, `AppLayout.css`) をフレックス配下に調整することで成立する。

## 2. 実装方針
1. **フレームの非表示化**: `main.ts` にて `BrowserWindow` オプションを `frame: false` に変更し、標準のタイトルメニューをなくす。
2. **ウィンドウ制御関数の実装**:
   - `main.ts` にて、最小化 (minimize)、最大化/復元 (maximize/restore toggle)、閉じる (close)、最大化状態取得などの IPC ハンドラーを実装する。
   - `preload.ts` や `desktop-api.d.ts` を拡張し、セキュアに Renderer プロセスへ公開する (`window.desktop.window.*`)。
3. **カスタムタイトルバーコンポーネントの作成**:
   - `src/layout/TitleBar.tsx` を新規作成する。
   - 高さを 36px 程度、背景色を `#F8FAFB` とし、目立たない細線境界線を敷く。
   - 全体をドラッグ可能エリア (`-webkit-app-region: drag`) とし、ボタン部分は非ドラッグ可能 (`-webkit-app-region: no-drag`) に設定。
   - `isDesktopRuntime()` で判定し、デスクトップ版のみ表示されるようにする。
   - 最大化状態はイベントで同期し、表示ボタンの切替を行う。
4. **レイアウトの統合**:
   - `Layout.tsx` を `flex flex-col` ベースの構造に変更し、タイトルバーと既存アプリケーション本体 (`AppLayout`) を縦に並べる。
   - `AppLayout.css` の `height: 100dvh` を `height: 100%; flex: 1;` に変更し、親のフレキシブルレイアウトに従うようにする。
   - 既存のフローティングUI（SyncStatusIndicator等）がタイトルバーに被らないよう、トップからの位置を微調整する。

## 3. 実際の変更コード
- 各対象ファイル（`main.ts`, `preload.ts`, `TitleBar.tsx`, `Layout.tsx`, etc.）に対し適用済み。

## 4. 変更ファイル一覧
- `electron/main.ts`
- `electron/preload.ts`
- `src/types/desktop-api.d.ts`
- `src/layout/TitleBar.tsx` (新規追加)
- `src/Layout.tsx`
- `src/layout/AppLayout.css`

## 5. 動作確認手順
1. パッケージマネージャで適宜変更を取り込み後、開発サーバーを立ち上げる(`npm run dev:electron` 等)。
2. Electron版として動作時に、Windows標準の白いタイトルバーが表示されないことを確認する。
3. 最上部にManifolia.カスタムタイトルバーが表示され、上部バーを掴んでウィンドウがドラッグ・移動できることを確認する。
4. 右上の各ボタン（最小化、最大化/復元、閉じる）をクリックし、想定通りのウィンドウ制御が走ることを確認。
5. タイトルバーダブルクリックで最大化/復元されるか（Windowsの `drag` 指定ネイティブ挙動として機能するか）を確認する。
6. React側でTypeScriptの型エラーがないことをターミナルで確認する (`npm run typecheck`等)。
