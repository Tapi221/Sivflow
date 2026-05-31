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

## tests/logic/StatisticsLogic.test.js

- [ ] カード配列が空なら空状態用の props を返す
- [ ] カードが存在するなら通常状態用の props を返す

## tests/cardSetViewWindowEvents.test.ts

- [ ] dispatches and receives typed draft patch payload

## tests/unit/application/cloudSyncLocalFieldStripping.test.ts

- [ ] removes local-only image fields from card payloads

## tests/unit/application/startup/RunStartupTasks.test.ts

- [ ] 整合性チェックの前に startup sync を実行する
- [ ] startup sync step の前に disposed なら sync を開始しない
- [ ] API 互換性のため resetStartupTasks を no-op に保つ

## tests/unit/brandedTypes.test.ts

- [ ] 有効な Blob URL なら true を返す
- [ ] Blob URL 以外なら false を返す
- [ ] 有効な Firebase Storage URL なら true を返す
- [ ] Storage URL 以外なら false を返す
- [ ] 有効な Base64 Data URL なら true を返す
- [ ] Base64 URL 以外なら false を返す
- [ ] 有効な Blob URL から BlobUrl を作成する
- [ ] 無効な Blob URL では例外を投げる
- [ ] 有効な Storage URL から StorageUrl を作成する
- [ ] 無効な Storage URL では例外を投げる

## tests/unit/calendarTimeGridLayout.test.ts

- [ ] 時刻イベントを top / height の percentage に変換する
- [ ] 短いイベントの layout height は実時間どおりにする
- [ ] weekday 表示の chip 高さは実時間を使い、最低表示高さはタイトル 1 行分にする
- [ ] weekday 表示の chip top を開始時刻と同じ時間位置にする
- [ ] 日跨ぎイベントを表示日の範囲に clip して top / height に反映する
- [ ] overlap mode では重なる event に横幅と xOffset を割り当てる
- [ ] no-overlap mode では重なる event を column に分ける
- [ ] weekday の最低表示高さで見た目が重なる event も横並びにして視覚的な重なりを作らない
- [ ] 短時間 event の weekday frame に compact 判定を付けない
- [ ] all-day event はデフォルトで time grid から除外する
- [ ] 週範囲内の event segment を left / right / span に変換する
- [ ] 重なる event segment を別 level に積む

## tests/unit/cardBlockNormalization.test.ts

- [ ] 古い legacy block arrays より canonical face blocks を優先する
- [ ] canonical face blocks が明示的に空なら legacy content を復活させない
- [ ] 未知の block type は code ではなく text にフォールバックする

## tests/unit/cardDurationNormalization.test.ts

- [ ] normalizes empty-string durationMinutes to null
- [ ] maps subjectiveScore-based logs to rating scale

## tests/unit/cardSetViewZoom.test.ts

- [ ] normalizes invalid values to 1
- [ ] clamps zoom to safe bounds
- [ ] scales typography values as px strings
- [ ] scales ruled row sizes as numbers
- [ ] builds typography style with scaled font size and line height

## tests/unit/cardSetViewZoomInputUtils.test.ts

- [ ] 細かなホイールズームではズームを 1% ずつ増減する
- [ ] 大きなトラックパッド delta では大きいステップ数を適用する
- [ ] 最小・最大境界へ clamp する
- [ ] Safari gesture scale を 1% 精度の presentation width semantics 経由で変換する
- [ ] no-op の gesture 変更では現在のズーム率を返す
- [ ] workspace 内の非インタラクティブ子孫を受け入れる
- [ ] zoom-input-ignore としてマークされた target を拒否する
- [ ] 編集可能な子孫を拒否する
- [ ] workspace 外の target を拒否する

## tests/unit/cardSetViewZoomUtils.test.ts

- [ ] 既存の幅デフォルトを percent に対応させて現在の視覚デフォルトを維持する
- [ ] percent を scale factor に変換する
- [ ] canonical card width を使って zoom percent を固定カード幅に変換する
- [ ] 最も近い 5% ステップへ切り下げる
- [ ] 1 ステップ未満を返さない
- [ ] 最小値と最大値に clamp する
- [ ] clamp 前に 5% 単位へ snap する
- [ ] 通常の最小値より低い dynamic max に対応する

## tests/unit/chip/eventchip/EventChip.spacing.test.tsx

- [ ] 週表示の通常チップはタイトルと時刻の間隔を小さく保つ
- [ ] リスト表示のチップもタイトルと時刻の間隔を小さく保つ
- [ ] リスト表示と週表示のタイトルと時刻の間隔を一致させる
- [ ] チップ本体の下に白い line mask を置いてグリッド線だけを隠す
- [ ] チップ本体の色トークンと透明度は line mask に移さず維持する
- [ ] 通常チップの 1 行タイトルは固定 line-height で表示する
- [ ] 通常チップの時刻も固定 line-height で表示する
- [ ] 通常チップの時刻は横幅が狭い時に折り返せる

## tests/unit/components/card/blocks/MarkdownBlock.test.tsx

- [ ] 初期状態はプレビューだけにする
- [ ] Markdown 編集で dialog が開き現在値が入る
- [ ] 編集して閉じるとプレビューに反映される
- [ ] 単改行が改行表示になる
- [ ] コードフェンスがコードブロックになる
- [ ] GFM のリストと打ち消しが崩れない
- [ ] dialog を閉じた後はプレビューのみになる
- [ ] プレビュー要素がレンダリングされる
- [ ] 空 Markdown に code fence を貼ると code ブロックで置換される
- [ ] markdown と code の混在を貼ると分割して置換される

## tests/unit/components/card/blocks/MarkdownBlockContent.test.tsx

- [ ] Markdown本文は常に左揃えになる
- [ ] 複数段落を個別の p 要素として描画する
- [ ] 段落の後にリストを別ブロックとして描画する
- [ ] 2行空行を空白段落として保持する
- [ ] 本文段落に whitespace 保持用の識別属性を付与する
- [ ] blockquote 内本文にも whitespace 保持用の識別属性を付与する
- [ ] blockquote 内の nested paragraph は whitespace selector の対象外にできる DOM 形になる

## tests/unit/components/card/CodeBlockConsistency.test.tsx

- [ ] long single-line code keeps no-wrap and horizontal scroll classes
- [ ] editor/view/preview use the same CodeBlockFrame structure
- [ ] editor contract keeps width-expanding host for horizontal scroll parity
- [ ] code block item keeps outer wrapper spacing neutralized
- [ ] viewer code block is not clipped by block wrapper overflow

## tests/unit/components/card/editor/cardEditorSessionCore.test.ts

- [ ] detects meaningful draft without React state
- [ ] extracts created card id from multiple payload shapes
- [ ] creates stable draft signature
- [ ] creates panel card from draft without React component state

## tests/unit/components/card/editor/useCardEditorSession.test.ts

- [ ] 入力直後に保存しても最新タイトルを保存する
- [ ] autoEdit が有効なら保存後も編集中を維持する
- [ ] autoEdit が無効なら保存後に編集を終了する

## tests/unit/components/card/Flashcard.layoutRows.test.tsx

- [ ] flip 前後で同じ高さを維持する

## tests/unit/components/card/MathBlockConsistency.test.tsx

- [ ] viewer and editor-preview path both use mathBlockRoot frame

## tests/unit/components/card/panels/MetaPanelPrimitives.test.tsx

- [ ] 共有 panel styling contract を 1 か所に保つ
- [ ] switch 変更を共有 meta panel wrapper 経由で転送する

## tests/unit/components/card/SharedCardContent.test.tsx

- [ ] view mode では共有 root と view scene を描画する
- [ ] edit mode では共有 root と edit scene を描画する

## tests/unit/components/folder/explorerDropRules.test.ts

- [ ] card は cardSet へは drop できる
- [ ] card -> folder/root は disableDrop される
- [ ] cardSet -> folder は許可される

## tests/unit/components/folder/folderDetailColumns.test.ts

- [ ] 列順の重複と未知の値を除去し、不足列を既定順で補完する
- [ ] 不正な列順は既定順に戻す
- [ ] 指定列を対象indexへ移動できる
- [ ] 範囲外の対象indexは安全に丸める
- [ ] 列順を反映したgrid-template-columnsと最小幅を生成する

## tests/unit/components/folder/hooks/useExplorerDerivedData.test.ts

- [ ] folder item 集計は CardSet.folderId を使い missing cardSetId は除外する
- [ ] moveCardSetToFolder 後は古い card.folderId でも表示先フォルダが追従する
- [ ] カードを別 CardSet へ移すと Explorer の所属フォルダ集計が追従する

## tests/unit/components/folder/panes/cardEditorPaneControllerCore.test.ts

- [ ] builds cardsById outside React
- [ ] resolves selected card snapshot from pure map
- [ ] applies draft patch only when editing current card

## tests/unit/components/ink/inkStorage.test.ts

- [ ] card と side の key で ink document を保存・読み込みする
- [ ] key が存在しない場合は指定 document にフォールバックする
- [ ] 保存済み key をクリアする

## tests/unit/components/pdf/PdfOverlayToolbar.test.tsx

- [ ] 幅に合わせるボタンを表示し active 状態を反映する
- [ ] disabled のとき幅に合わせるボタンを押せない
- [ ] レイアウト切り替えボタンは単一表示から 2 枚表示へ切り替える
- [ ] レイアウト切り替えボタンは 2 枚表示から単一表示へ切り替える
- [ ] ページ数が 1 のときレイアウト切り替えボタンを押せない

## tests/unit/components/pdf/usePdfOcr.test.tsx

- [ ] PDF identity が未解決の間は永続化済み OCR record を保持する
- [ ] active cache を削除せずに OCR retention を trim する
- [ ] 低品質 native text では拡張 profile で OCR を再試行し最良の試行を永続化する

## tests/unit/components/study/CardCarousel.test.tsx

- [ ] 中央カードが sessionCurrentIndex のカードを表示する
- [ ] 左右プレビューパネルに aria-hidden="true" が設定されている
- [ ] 次へボタンが先頭カードで有効になっている
- [ ] 前へボタンが末尾カードで有効になっている
- [ ] 先頭で ArrowLeft を押しても index が 0 未満にならない
- [ ] 末尾で ArrowRight を押しても範囲外にならない
- [ ] sessionCurrentIndex prop が変わると carousel が追従する

## tests/unit/components/ui/Button.test.tsx

- [ ] token class を使用しつつ default public variant contract を維持する
- [ ] export された variant 名を保持する

## tests/unit/components/ui/FormControls.test.tsx

- [ ] input、checkbox、switch、label に token-backed class を適用する
- [ ] select を共有 token-backed contract に保つ

## tests/unit/contexts/BreadcrumbContext.test.tsx

- [ ] setter 専用 consumer は extraCrumbs 更新で再レンダリングされない

## tests/unit/domain/card/selectors/cardFolder.test.ts

- [ ] resolveCardFolderId は CardSet.folderId を優先する
- [ ] resolveCardFolderId は CardSet が解決できない場合だけ Card.folderId にフォールバックする
- [ ] resolveCardFolderIdStrict は CardSet が解決できない場合は null を返す
- [ ] filterCardsByFolderId は CardSet ベースでカードを絞り込む

## tests/unit/features/breadcrumbs/builders.test.ts

- [ ] cardSetView のフォルダ一覧パンくずは現在フォルダに戻る
- [ ] folders 画面でもフォルダ一覧パンくずは現在フォルダに戻る
- [ ] current folder を解決できないときだけ section-list にフォールバックする

## tests/unit/features/calendar/CalendarView.month.test.tsx

- [ ] レンダーされている monthWeeks の先頭日〜末尾日を onRenderedRangeChange で通知する

## tests/unit/features/calendar/CalendarView.year.test.tsx

- [ ] 初期表示で現在年から描画し、下端付近で表示年を追加する

## tests/unit/features/calendar/GoogleCalendarSyncEngine.test.ts

- [ ] syncToken がない場合、フル同期を実行して範囲置換を呼ぶ
- [ ] status: 'cancelled' のイベントは範囲置換の events に含めない
- [ ] 初回フル同期は1年以上先の予定を含む未来範囲を取得する
- [ ] 変更イベントで onEventUpdated が呼ばれる
- [ ] status: 'cancelled' のイベントで onEventDeleted が呼ばれる
- [ ] 410 が返ったとき syncToken をクリアしてフル同期を実行する
- [ ] 401 が返ったとき silentReconnect を呼ぶ
- [ ] サイレント再接続できない場合は needsReconnect になる
- [ ] 一時的な再接続失敗は needsReconnect にしない
- [ ] rangeStart/rangeEnd を指定した範囲で events.list を実行する
- [ ] range sync 後、API に存在しない古いイベントが削除される
- [ ] forceSyncRange 後の polling が不要な full sync にならない
- [ ] lastSyncedAt が同期完了時に反映される
- [ ] 複数 account で同じ calendarId を持っても syncToken が衝突しない
- [ ] stop() 後は同期状態が idle になる
- [ ] clearAllSyncTokens() 後は localStorage の syncToken が空になる

## tests/unit/features/calendar/calendarEventRange.test.ts

- [ ] 開始日が範囲外でも期間が重なるイベントを検出する
- [ ] 複数日にまたがる予定の日付キーをすべて返す
- [ ] Google Calendar の終日予定の排他的な終了日は表示日に含めない
- [ ] 日をまたぐ時間付き予定を対象日にクリップする
- [ ] 対象日に重ならない予定は false/null になる

## tests/unit/features/calendar/calendarEventVisibility.test.ts

- [ ] hides events from a linked Google calendar when its project row is hidden
- [ ] hides events whose projectId is a legacy project label
- [ ] uses the Google calendar name as the source project when no explicit link exists
- [ ] keeps unrelated events visible when a hidden project does not own their source

## tests/unit/features/calendar/googleOAuthCooldown.test.ts

- [ ] 決定的な OAuth 失敗を cooldown 対象にする
- [ ] cooldown error を元の OAuth reason 付きで分類する

## tests/unit/features/calendar/googleOAuthServerErrors.test.ts

- [ ] treats invalid_grant as a reconnect-required user action
- [ ] does not tell users to reconnect for server OAuth configuration errors
- [ ] does not tell users to reconnect when stored tokens cannot be decrypted
- [ ] treats insufficient Calendar or Tasks scope as reconnect-required

## tests/unit/features/calendar/grid/Grid.calendar.weekday.desktop.test.tsx

- [ ] 終日ラベルと00:00ラベルを別行に描画し、00:00を上端方向にずらさない
- [ ] 24:00ラベルを境界線中央に合わせ、時刻列側ではクリップしない
- [ ] 24:00以降プレビューの表示領域を30分ぶんの高さにする
- [ ] 24:00以降プレビューでは0:30以降に始まるeventを描画しない
- [ ] 24:00以降プレビューのeventは表示範囲で切り詰めず、元の終了時刻を渡す
- [ ] 時刻ラベルの色、背景、数字用スタイルを維持する
- [ ] 終日ラベルとグリッド線の色を維持する
- [ ] 終日イベントの色トークンをそのまま使う

## tests/unit/features/calendar/monthSpacerGridStyle.test.ts

- [ ] spacer line token を calendar grid と同じ細い色・幅に保つ
- [ ] 保証された line color と width token から spacer background を描画する

## tests/unit/features/calendar/useCalendarEventSync.test.tsx

- [ ] 年表示ではレンダー済み年範囲を同期する
- [ ] 月表示ではレンダー済み範囲を優先して前後 buffer を付けて同期する
- [ ] 日表示では visibleDays の前後2日を同期範囲にする
- [ ] 週表示では visibleDays の前後3日を同期範囲にする

## tests/unit/features/calendar/useGoogleTaskLists.test.tsx

- [ ] missing Google Tasks scope を空リスト扱いせず再連携可能な権限エラーとして表示する
- [ ] refresh token が無い場合も silent access token で Google Tasks list loading を復旧する

## tests/unit/features/cardFile/importMfCard.test.ts

- [ ] mfcard を1枚のカードとして新規カードセットに取り込む

## tests/unit/features/cardFile/mfCardJsonCodec.test.ts

- [ ] mfcard v1 をJSONとして往復できる
- [ ] mfcard v1 ではないJSONを拒否する

## tests/unit/features/cardsetview/CardViewCompactToolbar.test.tsx

- [ ] Enter で入力カード番号を commit する
- [ ] blur 時に範囲外入力を clamp する
- [ ] 空入力の blur は現在カード番号へ戻す

## tests/unit/features/cardsetview/components/DesktopCardSurface.flipState.test.tsx

- [ ] card が inactive になっても flipped state を維持する
- [ ] fluid mode を ink controls なしで渡す

## tests/unit/features/cardsetview/hooks/useCardSetViewZoom.test.tsx

- [ ] display mode・interaction mode・layout mode をまたいで保存済み zoom を共有する
- [ ] view と edit で zoom semantics を同一に保つ
- [ ] legacy scoped key を unified key に移行する
- [ ] split availability を requested layout mode から独立して評価する
- [ ] ユーザー変更前は viewport 由来の default を再計算する

## tests/unit/features/cardsetview/useCardSetViewActions.test.ts

- [ ] mount だけではカードを永続化しない
- [ ] 明示操作のときだけ createAndFocusCard を通してカードを生成する
- [ ] トグル操作は既存 use case に委譲する

## tests/unit/features/explorer/adapters/web/explorerSectionListNavigation.test.ts

- [ ] dispatches section-list navigation requests to subscribers
- [ ] does not notify unsubscribed listeners

## tests/unit/features/import/XlsxImportDialog.test.tsx

- [ ] 有効なXLSXを読み込むとプレビュー表示後に新規カードセットとしてインポートできる
- [ ] blocking error があると issue を表示し、インポートボタンを無効化する
- [ ] 既存カードセット追加モードでは existing-card-set 宛先でインポートする
- [ ] テンプレートダウンロードボタンで生成処理を呼ぶ
- [ ] folderId が無いときはインポートせずエラートーストを出す
- [ ] issues 一覧にエラー内容を表示する

## tests/unit/features/import/importFileKind.test.ts

- [ ] 拡張子からインポート形式を判定する
- [ ] MIME type からインポート形式を判定する
- [ ] 未知のファイル形式を拒否できる

## tests/unit/features/import/xlsxImportUseCases.test.ts

- [ ] ファイル読込と parse を application use case でまとめる
- [ ] folderId が無い場合は validation error を返す
- [ ] 既存カードセット宛先を application use case で組み立てる
- [ ] blocking error がある場合は import を実行しない

## tests/unit/features/review/VerticalCardPager.test.tsx

- [ ] request key が変わった時だけ active card へ scroll する
- [ ] 明示ジャンプ時に custom scroll behavior を使う
- [ ] StrictMode の mount / unmount で ReferenceError を出さない

## tests/unit/features/review/useCardCarousel3DWebBridge.test.tsx

- [ ] unmount 時に observer を cleanup する
- [ ] unmount 時に保留中の debounce timer を破棄し、後続通知を発火しない
- [ ] activeIndex 変更時に observer を差し替える前の disconnect を呼ぶ

## tests/unit/features/scroll/schedule/useCalendarScrollController.test.tsx

- [ ] 週表示の初期描画で保存済みの縦スクロール位置を復元する
- [ ] 週表示のスクロール時に縦スクロール位置を保存する
- [ ] 月表示では週表示用の縦スクロール位置を復元・上書きしない

## tests/unit/firebaseEmulatorConfigConsistency.test.ts

- [ ] matches firebase.json emulator host and port

## tests/unit/functions/googleTokenErrors.test.ts

- [ ] invalid_grant を reconnect-required failed-precondition に分類する
- [ ] invalid_client を server OAuth configuration に分類する
- [ ] 実際の token endpoint 障害を retryable unavailable に分類する

## tests/unit/hooks/useCards.test.ts

- [ ] createCard は cardSet 単位の questionNumber を採番する
- [ ] moveCardToSet は cardSetId/orderIndex を同期する
- [ ] reorderCardsInCardSet は CardSet スコープ外カードを reject する
- [ ] updateCard は cardSetId / folderId の直接更新を reject する

## tests/unit/hooks/useCardSets.test.ts

- [ ] moveCardSetToFolder は card.folderId を更新しない

## tests/unit/hooks/useStudyCards.test.ts

- [ ] folder 絞り込みは CardSet.folderId ベースで、missing cardSetId は除外する
- [ ] moveCardToSet 後は Study 側の所属フォルダが CardSet 変更に追従する

## tests/unit/imageInvariants.test.ts

- [ ] remoteUrl 内の Base64 を拒否する
- [ ] localUrl 内の Base64 を拒否する
- [ ] thumbnailUrl 内の埋め込み Base64 マーカーを拒否する
- [ ] localUrl の有効な Blob URL を受け入れる
- [ ] remoteUrl と thumbnailUrl の有効な Storage URL を受け入れる
- [ ] Storage URL を持つ有効な画像を通す
- [ ] Blob URL を持つ有効な画像を通す
- [ ] 有効な thumbnail Storage URL を通す
- [ ] https でも無効な remoteUrl は拒否する
- [ ] https でも無効な thumbnailUrl は拒否する
- [ ] Blob URL ではない無効な localUrl を拒否する
- [ ] remoteUrl 内の埋め込み Base64 マーカーを拒否する

## tests/unit/imageNaturalSize.test.ts

- [ ] 空の source では null を返す
- [ ] 画像読み込みに成功したら自然サイズを返す
- [ ] 画像読み込みに失敗したら null を返す

## tests/unit/importCardsFromPayload.test.ts

- [ ] xlsx 拡張子を除いた名前をベースにする
- [ ] 新規カードセット作成時は指定名を優先して createCardSet を呼ぶ
- [ ] 既存カードセット追加時は createCardSet を呼ばず cardSetId をそのまま使う
- [ ] 作成されるカードの orderIndex は投入順に単調増加する

## tests/unit/layout/AppLayout.test.tsx

- [ ] 画面幅が 768px 以上なら左サイドバーを表示する
- [ ] 画面幅が 768px 未満なら左サイドバーを表示しない
- [ ] 左サイドバーのトグルを押すとレイアウト全体も閉じた状態になり、再度押すと開いた状態に戻る

## tests/unit/layout/TitleBar.test.tsx

- [ ] 現在地のパンくずにもクリック可能なパンくずと同じメトリクスクラスを付与する
- [ ] 階層が深くなってもフォルダ一覧パンくずは同じメトリクスクラスを維持する

## tests/unit/layout/WorkspaceShell.test.tsx

- [ ] タブ非表示時は without-tabs クラスで breadcrumb と main だけを直接配置する
- [ ] タブ表示時は tabs / breadcrumb / main の3行構造にする
- [ ] without-tabs 用のCSSで main が暗黙行に落ちないようにする

## tests/unit/lib/pdf/pdfTextExtraction.test.ts

- [ ] prefers OCR when native text quality is much lower
- [ ] guesses japanese-first OCR for Japanese heavy text
- [ ] scores readable paragraph text above noisy symbols

## tests/unit/pane.desktop/leftpane/folder/LayeredDirectorySidebar.test.ts

- [ ] MY PROJECTS では hierarchy tree ではなく flat project list を使う
- [ ] project content count badges を描画しない
- [ ] click で選択 project を explorer mode で開く
- [ ] right-click で layered project context menu を開く

## tests/unit/pane.desktop/leftpane/Sidebar.desktop.test.tsx

- [ ] トグルアイコンは閉じる状態と開く状態を切り替え、操作名も現在状態に合わせて変える
- [ ] セクションを持つアイコンはクリックした画面をアクティブ表示にする
- [ ] 探すアイコンは検索を開き、サイドバーのアクティブセクションは変更しない
- [ ] 日本語ロケールではサイドバー項目のツールチップも日本語で表示する
- [ ] 英語ロケールではサイドバー項目とツールチップを英語で表示する

## tests/unit/pane.desktop/leftpane/schedule/CalendarSidebar.test.tsx

- [ ] MY PROJECTS の見出しにカレンダーアイコンを描画しない
- [ ] GOOGLE CALENDARS のセクション見出しと追加ボタンを描画しない
- [ ] MY PROJECTS と Google アカウント一覧の間に区切り線を描画しない

## tests/unit/pane.desktop/tab.desktopnative/useTabsStore.test.ts

- [ ] project を開くと既存 explorer tab state を更新する

## tests/unit/parseImportRows.test.ts

- [ ] rows から payload を組み立て、side 未指定は front 扱いにする
- [ ] 必須ヘッダー不足なら missing_required_header error を返す
- [ ] warning は維持しつつ error があれば payload を返さない

## tests/unit/parseXlsxImport.test.ts

- [ ] blocks シートの有効な行を cardId ごとにまとめ、side ごとに front/back へ振り分ける
- [ ] blocks シートが無いと missing_sheet error を返す
- [ ] 必須ヘッダー不足なら payload を作らず missing_required_header error を返す
- [ ] side が不正な値なら invalid_side error を返す
- [ ] type=image は unsupported_image_cell error として止める
- [ ] 同じ cardId と side 内で blockOrder が重複すると duplicate_block_order error を返す
- [ ] front と back で同じ blockOrder でも別面なら許可する
- [ ] warning だけなら payload を返しつつ issues に warning を残す

## tests/unit/pdfPageResourceCache.test.ts

- [ ] retain 中の page を evict しない
- [ ] release 済みの least recently used page を evict する
- [ ] release を冪等に保つ

## tests/unit/pdfRenderQuality.test.ts

- [ ] CSS layout size の関心事を backing-store 計算から分離する
- [ ] 指定された device pixel ratio が無効なら 1x にフォールバックする

## tests/unit/pdfViewerTypes.test.ts

- [ ] PDF.js のキャンセルエラーを検出する
- [ ] シリアライズ可能なエラー詳細を抽出する
- [ ] destroy の前に cleanup を実行する

## tests/unit/pdfZoomUtils.test.ts

- [ ] 小数第3位に丸める
- [ ] 最小値・最大値に clamp し、反転した境界にも対応する
- [ ] 正の deltaY では縮小し、負の deltaY では拡大する
- [ ] 方向が 0 の場合は null を返す
- [ ] clamp と 3 桁正規化を適用する
- [ ] delta の大きさに応じてホイールステップ数をスケールする
- [ ] baseScale * gestureScale を使用して正規化する
- [ ] baseScale が null の場合は currentScale にフォールバックする
- [ ] 無効な gesture scale では null を返す
- [ ] clamp を適用する

## tests/unit/platform/desktopHandwritingSessionManager.test.ts

- [ ] starts a desktop handwriting session and creates its document slot
- [ ] attaches a mobile device and marks the session connected
- [ ] receives a stroke delta and merges it into the session document
- [ ] rejects messages for unknown sessions
- [ ] updates session status from control messages
- [ ] closes or fails a session and clears it when active

## tests/unit/platform/handwritingSessionLifecycle.test.ts

- [ ] creates a waiting desktop handwriting session
- [ ] attaches a mobile device and marks the session connected
- [ ] updates session status without changing identity fields
- [ ] closes or fails a session
- [ ] treats waiting and connected sessions as active

## tests/unit/platform/handwritingStrokeMessages.test.ts

- [ ] creates a normalized stroke delta message
- [ ] applies a stroke delta to an ink document
- [ ] rejects mismatched session/card/side
- [ ] rejects duplicate strokes

## tests/unit/platformDesktopShellOpenExternal.test.ts

- [ ] http(s)/mailto は desktop bridge に委譲する
- [ ] http(s)/mailto 以外の URL では window.open にフォールバックする

## tests/unit/platformIndex.test.ts

- [ ] デスクトップブリッジが利用できない場合は Web プラットフォームを使用する
- [ ] デスクトップブリッジが利用できる場合はデスクトッププラットフォームを使用する

## tests/unit/reviewAlgorithm.test.ts

- [ ] 初回レビュー間隔を主観スコアに応じて変化させる
- [ ] 永続化用レビュー patch 作成時に計算済み間隔を使用する
- [ ] 初回以降もスコアに応じて間隔を変化させる

## tests/unit/routes/Schedule.mobile.test.tsx

- [ ] モバイルのスケジュール画面を使用し、デスクトップのプロジェクトコンテキストメニューパスをマウントしない
- [ ] モバイルのスケジュール画面をデスクトップのプロジェクトサイドバーコンテキストメニューから分離する

## tests/unit/scrollbarVisibility.test.ts

- [ ] スクロールバーの太さを決める --scrollbar-size の値を 1px に固定する
- [ ] WebKit 系ブラウザのスクロールバー幅と高さを --scrollbar-size で制御する
- [ ] 通常時は透明で、hover 時だけスクロールバーのつまみを表示し、focus-within と active では表示しない

## tests/unit/security/policy.test.ts

- [ ] exposes a single authoritative set of security event types
- [ ] windowed rule does not add score before threshold
- [ ] windowed rule adds score at threshold
- [ ] always-trigger rule adds score immediately
- [ ] applies decay before score addition
- [ ] calculates next score from decayed base score
- [ ] resolves risk level thresholds deterministically

## tests/unit/services/cardSetViewFlippedFacePreferences.test.ts

- [ ] deviceScope + cardSetId を現在の永続化 key として使用する
- [ ] flipped ids を localStorage に永続化する
- [ ] deviceScope ごとに状態を分離する
- [ ] ids が空になったら永続化 entry を削除する

## tests/unit/services/localDB.resilience.test.ts

- [ ] 同時 getInstance 呼び出しでは同じ in-flight promise を返す
- [ ] ログアウト reset を best-effort に保ち、失敗理由を保存する
- [ ] backing-store UnknownError で fallback mode に切り替え、無限に再試行しない
- [ ] backing-store 失敗が繰り返されても generation bump は session あたり最大 1 回にする
- [ ] ログアウト reset 時に既知のすべての generation の削除を試みる
- [ ] LocalDB telemetry snapshot key を公開する
- [ ] LocalDB telemetry を session key ごとに 1 回だけ送出する

## tests/unit/services/logic/DiffEngine.test.ts

- [ ] オブジェクトが同一なら null を返す
- [ ] 単純なフィールド変更を検出する
- [ ] メタデータフィールドを無視する
- [ ] ローカル変更がない場合は remote の変更をマージする
- [ ] 両側が変更されている場合は競合を検出する
- [ ] client_wins 戦略を尊重する
- [ ] ID が一致しない場合は false を返す
- [ ] 基本データに整合性がある場合は true を返す

## tests/unit/tests/BlobUrlManager.test.ts

- [ ] Blob URL を生成できる
- [ ] Blob URL を解放できる
- [ ] 上限（20枚）を超えると最古の URL を自動解放
- [ ] すべての Blob URL を解放できる

## tests/unit/tests/DiffEngine.test.ts

- [ ] 差分がない場合は null を返す
- [ ] フィールド変更を検出する
- [ ] メタデータフィールドを無視する
- [ ] JSON 比較で構造的な変更を検出する
- [ ] 入力が欠けている場合は null を返す
- [ ] local が null の初回同期では remote データを返す
- [ ] remote が null の場合は local データを返す
- [ ] サーバー側に新しいデータがある場合は local を更新する
- [ ] local だけが変更されている場合は local を保持する
- [ ] 両側が変更されている場合は競合を検出する
- [ ] 競合時に client_wins 戦略を尊重する
- [ ] ID が一致していれば true を返す
- [ ] ID が一致しなければ false を返す
- [ ] どちらかが欠けている場合は false を返す

## tests/unit/tests/cardNormalization.test.ts

- [ ] questionBlocks と answerBlocks から空の数式ブロックを除外する
- [ ] 数式ブロックにデフォルト値を補う
- [ ] レガシーフィールドをブロックへ変換する
- [ ] レイアウト行数を正規化する
- [ ] レガシーの面別追加行数を大きい側に合わせて layoutRows へ移行する
- [ ] layoutRows を互換上限で clamp しない
- [ ] コードブロックの rowOffset を非負 clamp 付きで offsetRows へ移行する
- [ ] 数式ブロックの rowOffset を非負 clamp 付きで offsetRows へ移行する

## tests/unit/tests/dateNormalization.test.ts

- [ ] treats numeric epoch seconds as seconds
- [ ] treats numeric epoch milliseconds as milliseconds
- [ ] treats 10-13 digit numeric strings as epoch values
- [ ] supports firestore-like timestamp objects

## tests/unit/tests/navigationAndFolderNormalization.test.ts

- [ ] maps legacy silent into isSilent and synthesizes deletedAt

## tests/unit/tests/NetworkMonitor.test.ts

- [ ] good ステータスで開始する
- [ ] 失敗しきい値に達したら即座に poor へ下げる
- [ ] RTT が遅い場合は即座に poor へ下げる
- [ ] poor から good へ回復するには複数回の成功が必要
- [ ] excellent に到達するには厳密な条件が必要
- [ ] オフライン状態を検出する
- [ ] リスナーへの通知を確認する
- [ ] user_initiated 同期には最大リソースを与える
- [ ] Good 状態のバックグラウンド同期には制限されたリソースを与える
- [ ] Poor 状態では非常に制限されたリソースを与える
- [ ] Excellent 状態では高めの容量を許可する

## tests/unit/tests/toMillis.test.ts

- [ ] 数値の epoch 秒を秒として扱う
- [ ] 数値の epoch ミリ秒をミリ秒として扱う
- [ ] 10〜13 桁の数値文字列を epoch 値として扱う
- [ ] seconds と nanoseconds を持つ Firestore 風 timestamp object に対応する
- [ ] toMillis() を持つ timestamp object に対応する
- [ ] 無効な値では nullish fallback を安全に返す
- [ ] Date object を意味を変えずに正規化する
- [ ] normalizeDate を toDateOrNull と一致させる

## tests/unit/tests/uploadFlow.test.ts

- [ ] 初期状態は idle ステータスになる
- [ ] ファイルサイズを検証する
- [ ] MIME タイプを検証する

## tests/unit/useExplorerStore.test.ts

- [ ] filter state を hydrate しつつ legacy history と tab state を破棄する
- [ ] invalid persisted filter values を正規化する

## tests/unit/utils/blobUrlSanitizer.test.ts

- [ ] detects blob url string
- [ ] sanitizes nested blob urls and returns fix paths
- [ ] preserves Date and toDate-capable objects

## tests/unit/utils/markdownWhitespace.test.ts

- [ ] 本文段落ではタブを設定値のスペースへ展開する
- [ ] 引用内本文でもタブを設定値のスペースへ展開する
- [ ] インラインコード内のタブは保持し、同一段落の通常テキストだけ展開する
- [ ] コードフェンス内のタブは保持する
- [ ] ATX 見出し行のタブは保持する
- [ ] Setext 見出し本文のタブは保持する
- [ ] リスト行のタブは保持する
- [ ] 引用内リスト行のタブは保持する
- [ ] 表行のタブは保持する
- [ ] editor value 正規化では nbsp を通常スペースへ変換し、末尾改行を落とす
- [ ] 本文段落では Tab キー入力がスペースへ変わる
- [ ] インラインコード内では Tab キー入力が literal tab になる
- [ ] コードフェンス内では Tab キー入力が literal tab になる

## tests/unit/verticalCardPagerWidthSpec.test.ts

- [ ] 幅戦略が指定されていない場合は固定幅にフォールバックする
- [ ] getCardWidthSpec が stretch を返す場合は stretch mode を使用する
- [ ] 固定幅を少なくとも 1px に clamp する
- [ ] 固定幅 item style を構築する
- [ ] stretch 幅 item style を構築する

## tests/unit/weekdayTimeGridGeometry.test.ts

- [ ] 24:00 をまたぐ当日側 event は minHeight を抑制して下端からはみ出さない
- [ ] 24:00 以降プレビューは 30 分範囲で 0 時台 event の位置と高さを計算する
- [ ] 24:00 前後の同じ長さの event は同じ表示高さと minHeight になる
- [ ] 24:00 以降プレビューは 0:30 以降の event を範囲外として扱う
- [ ] 24:00 前後の overlap event は同じ横並び column を割り当てる
