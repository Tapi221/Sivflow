# Coding Rule

## import とファイル構造

import パスがズレている時、互換パスを追加することは禁止する。互換用の再 export や別名入口を増やさず、呼び出し元の import パスを正しい責務の module へ修正する。

project 内の import/export-from は alias に統一し、`./` と `../` で始まる相対パスは禁止する。利用する alias は tsconfig、Vite、または package imports に定義された `@/`、`@web/`、`@mobile/`、`@core/`、`@platform/`、`@web-renderer/`、`@mobile-renderer/`、`@shared/`、`#src/` を使う。

named import 内に `type` 修飾子を書くことは禁止する。型だけを import する場合は `import type` を使う。値 import と型 import が同じ module から混在する場合は、値 import と `import type` を分ける。

```ts
// NG
import { type CSSProperties, type RefObject } from "react";
import { memo, type CSSProperties } from "react";

// OK
import type { CSSProperties, RefObject } from "react";
import { memo } from "react";
import type { CSSProperties } from "react";
```

import 群は1つの連続したブロックにする。import 文同士の間に空行を入れない。type import と値 import の間も空行を入れない。

```ts
import { Platform } from "react-native";
import * as ExpoCalendar from "expo-calendar";
import type { Calendar as ExpoCalendarItem, Event as ExpoCalendarEvent } from "expo-calendar";
import { normalizeCalendarRecurrenceRule } from "@core/calendar";
import type { CalendarRecurrenceRule } from "@core/calendar";
import type { IosCalendarEvent } from "@platform/ioscalendar/iosCalendar.types";
```

ファイル内では、import、型定義、定数、helper 関数、component 本体、memo / displayName / export の順に記述する。依存関係がある場合は、依存されるものを先に記述する。

## script 配置

repo 全体の運用スクリプトは root の `scripts/` 配下に置く。`functions/scripts/` は作らない。

Firebase Functions に関係する運用スクリプトは `scripts/functions/` または `scripts/predeploy/` に置く。`functions/` 配下は Cloud Functions の実装、ビルド成果物、functions package 設定に限定する。

`functions/package.json` から root scripts を呼ぶ場合は `../scripts/...` を使う。互換用の wrapper を `functions/scripts/` に残すことは禁止する。

## 空行

import 文同士の間に空行を入れない。

同じブロック内の top-level 文同士にも空行を入れない。型定義同士、定数同士、helper 関数同士、component 同士、memo / displayName / export 同士は連続して記述する。

import、型定義、定数、helper 関数、component 本体、memo / displayName / export の各ブロック間だけ、空行1行を入れる。ブロック間の空行なし、または空行2行以上は禁止する。

連続する空行は source file 全体で禁止する。`/// <reference ... />`、import 群、型定義、定数、helper 処理、`export {}` の前後も例外にしない。

JSX の同一 parent 内で、連続する JSX tag child の間に意味のない空行を入れない。視覚的なグルーピングが必要な場合は component 分割、変数化、またはコメントで意図を明示する。

```ts
import { value } from "@/value";
import type { Value } from "@/value.types";

type LocalValue = Value;
type LocalValueId = string;

const LOCAL_VALUE_PREFIX = "local";
const LOCAL_VALUE_LIMIT = 100;

const createLocalValueId = (id: string) => `${LOCAL_VALUE_PREFIX}:${id}`;
const isLocalValueId = (id: string) => id.startsWith(`${LOCAL_VALUE_PREFIX}:`);
```

`npm run lint`、`npm run lint:fix`、`npm run fix:source-conventions` は、source 規約の空行、JSX 子要素間の空行、type-only import を自動で正規化する。自動整形 script が import 間だけを直して、同じブロック内またはブロック間の余分な空行を残す状態は禁止する。

`npm run verify:source-conventions` は `verify:blank-lines` と `verify:jsx-child-spacing` を含めて実行し、連続空行と JSX 子要素間の意味のない空行を検出する。連続空行の検査は `scripts/verify/verify-repeated-blank-lines.mjs` に置き、JSX 子要素間の空行検査は `scripts/verify/verify-jsx-child-spacing.mjs` に置く。

import 間の空行検査と自動修正は、import 文直前の空白・改行も対象に含める。AST の `getFullStart()` だけを基準にして import 前の空行を取り逃がす実装は禁止する。

`verify:*` は検査だけを行い、ファイルを書き換える処理は `fix:*` にだけ置く。

## 末尾カンマ

複数行の配列、object、import、export、関数引数、関数呼び出し、enum、tuple では末尾カンマを付ける。1行の場合は末尾カンマを付けない。

```ts
// NG
const values = [
  "a",
  "b"
];
const user = {
  id: "1",
  name: "rr"
};
createUser(
  "1",
  "rr"
);

// OK
const values = [
  "a",
  "b",
];
const user = {
  id: "1",
  name: "rr",
};
createUser(
  "1",
  "rr",
);

// OK: 1行の場合は末尾カンマを付けない
const inlineValues = ["a", "b"];
const inlineUser = { id: "1", name: "rr" };
createUser("1", "rr");
```

TS generics の末尾カンマは ESLint では強制しない。TSX の構文上必要な `<T,>` のようなケースは許可する。

```tsx
const useValue = <T,>(value: T) => value;
```

`npm run lint` は ESLint の `@stylistic/comma-dangle` で末尾カンマ違反を検出する。`npm run lint:fix` は安全に修正できる末尾カンマ違反を自動修正する。

## 変数宣言

`var` は禁止する。変数宣言は基本的に `const` を使い、再代入が必要な場合だけ `let` を使う。

`npm run lint` は `var` と再代入されない `let` を検出する。`npm run lint:fix` は安全に修正できる場合に `var` と再代入されない `let` を自動修正する。

## 等価比較

等価比較では `==` / `!=` を使わず、`===` / `!==` を使う。

```ts
// NG
const isSame = currentId == selectedId;
const isDifferent = currentId != selectedId;

// OK
const isSame = currentId === selectedId;
const isDifferent = currentId !== selectedId;
```

`null` または `undefined` の両方を欠落扱いしたい場合も、`value == null` や `value != null` に任せない。`value === null || value === undefined`、または `value !== null && value !== undefined` のように明示する。

`npm run lint` は ESLint の `eqeqeq` で `==` / `!=` を検出する。`npm run lint:fix` は安全に修正できる範囲で `scripts/verify/fix-strict-equality.mjs` により `===` / `!==` へ自動修正する。

## nullish fallback

`null` と `undefined` のどちらかを全面禁止しない。

値が欠落している場合だけ代替値を使う処理では、`||` ではなく `??` を使う。`||` は `false`、`0`、`""` も代替値へ置き換えるため、値の欠落判定には使わない。

```ts
// NG
const page = inputPage || 1;
const title = inputTitle || "Untitled";
const enabled = inputEnabled || true;

// OK
const page = inputPage ?? 1;
const title = inputTitle ?? "Untitled";
const enabled = inputEnabled ?? true;
```

`false`、`0`、`""` を欠落扱いしたい場合は、`||` に任せず、意図が分かる条件式や helper 関数で明示する。

```ts
const title = inputTitle.trim() === "" ? "Untitled" : inputTitle;
```

`npm run verify:nullish-fallback` は、`||` の右辺が string / number / boolean / object / array literal で、値を返す文脈にあるものだけを検出する。boolean 合成の `isReady || isLoading` のような式は対象にしない。`npm run fix:nullish-fallback` は同じ対象を `??` へ自動修正する。`npm run fix:source-conventions` と `npm run verify:source-conventions` はこの検査を含めて実行する。

## export

実装ファイルでは、原則として宣言時 export を使わない。値・型はローカルに定義し、ファイル末尾でまとめて export する。

default export は禁止する。export は named export に統一する。

値の export と型の export は分ける。値は `export { ... };`、型は `export type { ... };` を使う。`export { type Foo }` のように named export 内へ `type` 修飾子を書くことは禁止する。

local named export は値と型それぞれ1つにまとめる。値の `export { ... };` を複数に分けない。型の `export type { ... };` も複数に分けない。module specifier を持つ re-export は対象外とする。

`npm run fix:source-conventions` は分割された local named export を統合する。`npm run verify:source-conventions` は分割された local named export を検出する。
