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

## tests/unit/components/card/editor/useCardEditorSession.test.ts

- [ ] 入力直後に保存しても最新タイトルを保存する
- [ ] autoEdit が有効なら保存後も編集中を維持する
- [ ] autoEdit が無効なら保存後に編集を終了する

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

## tests/unit/contexts/BreadcrumbContext.test.tsx

- [ ] setter 専用 consumer は extraCrumbs 更新で再レンダリングされない

## tests/unit/domain/card/selectors/cardFolder.test.ts

- [ ] resolveCardFolderId は CardSet.folderId を優先する
- [ ] resolveCardFolderId は CardSet が解決できない場合だけ Card.folderId にフォールバックする
- [ ] resolveCardFolderIdStrict は CardSet が解決できない場合は null を返す
- [ ] filterCardsByFolderId は CardSet ベースでカードを絞り込む

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

## tests/unit/firebaseEmulatorConfigConsistency.test.ts

- [ ] matches firebase.json emulator host and port

## tests/unit/hooks/useCards.test.ts

- [ ] createCard は cardSet 単位の questionNumber を採番する
- [ ] moveCardToSet は cardSetId/orderIndex を同期する
- [ ] reorderCardsInCardSet は CardSet スコープ外カードを reject する
- [ ] updateCard は cardSetId / folderId の直接更新を reject する

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

## tests/unit/importCardsFromPayload.test.ts

- [ ] xlsx 拡張子を除いた名前をベースにする
- [ ] 新規カードセット作成時は指定名を優先して createCardSet を呼ぶ
- [ ] 既存カードセット追加時は createCardSet を呼ばず cardSetId をそのまま使う
- [ ] 作成されるカードの orderIndex は投入順に単調増加する

## tests/unit/layout/TitleBar.test.tsx

- [ ] 現在地のパンくずにもクリック可能なパンくずと同じメトリクスクラスを付与する
- [ ] 階層が深くなってもフォルダ一覧パンくずは同じメトリクスクラスを維持する

## tests/unit/pane.desktop/leftpane/Sidebar.desktop.test.tsx

- [ ] トグルアイコンは閉じる状態と開く状態を切り替え、操作名も現在状態に合わせて変える
- [ ] セクションを持つアイコンはクリックした画面をアクティブ表示にする
- [ ] 探すアイコンは検索を開き、サイドバーのアクティブセクションは変更しない
- [ ] 日本語ロケールではサイドバー項目のツールチップも日本語で表示する
- [ ] 英語ロケールではサイドバー項目とツールチップを英語で表示する

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

## tests/unit/tests/navigationAndFolderNormalization.test.ts

- [ ] maps legacy silent into isSilent and synthesizes deletedAt

## tests/unit/tests/uploadFlow.test.ts

- [ ] 初期状態は idle ステータスになる
- [ ] ファイルサイズを検証する
- [ ] MIME タイプを検証する

## tests/unit/utils/blobUrlSanitizer.test.ts

- [ ] detects blob url string
- [ ] sanitizes nested blob urls and returns fix paths
- [ ] preserves Date and toDate-capable objects
