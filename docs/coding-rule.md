# Coding Rule

## import とファイル構造

import パスがズレている時、互換パスを追加することは禁止する。互換用の再 export や別名入口を増やさず、呼び出し元の import パスを正しい責務の module へ修正する。

import は複数行に展開せず、各 import 文を1行にまとめる。同一階層の参照は相対パスを使用し、階層をまたぐ参照は @/ エイリアスを使用する。

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
import type { IosCalendarEvent } from "./iosCalendar.types";
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
import { value } from "./value";
import type { Value } from "./value.types";

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

export 群はファイル末尾の1つの連続したブロックにする。直前の component / helper / memo / displayName ブロックとの間には空行1行を入れる。export 文同士の間には空行を入れない。

export 群の順序は、値 export、type export の順にする。

互換 export ファイルは禁止する。移動・リネーム・責務分離後に、旧 import パスを維持するためだけの `export * from "..."` / `export { ... } from "..."` / `export type { ... } from "..."` だけのファイルを作らない。呼び出し元の import パスを正しい module へ修正する。

`index.ts` / `index.tsx` で責務のある公開 API を集約する場合だけ例外とする。非 index ファイルを旧 path 互換の入口として残すことは禁止する。

`npm run verify:no-compat-export-files` は、非 index source file が export-from 宣言だけで構成されている場合に検出する。`npm run verify:source-conventions` はこの検査を含めて実行する。

```ts
const AppProviders = ({ children }: AppProvidersProps) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

export { AppProviders };
export type { AppProvidersProps };
```

## 定数

モジュールスコープの固定値・設定値として定義する `const` は、大文字 + アンダースコアの `UPPER_SNAKE_CASE` にする。対象は定数ブロックに置く値で、関数内の一時変数、`const helper = (...) => ...` のような helper 関数、component / memo / displayName / export 用の識別子は対象外とする。

## 色表記

hex color は、省略可能な場合は省略表記に統一する。`#rrggbb` は `rr`、`gg`、`bb` の各2桁が同じ時だけ `#rgb` にする。`#rrggbbaa` は alpha を含む各2桁が同じ時だけ `#rgba` にする。

```css
/* NG */
color: #ffffff;
background: #eeeeee;
border-color: #aabbcc;
box-shadow: 0 0 0 1px #ffffffff;

/* OK */
color: #fff;
background: #eee;
border-color: #abc;
box-shadow: 0 0 0 1px #ffff;
```

`#fefefe`、`#eeeeef`、`#12aa33` のように各2桁が同じではない hex color は省略しない。hex color は小文字に統一する。

`npm run fix:short-hex-colors` は省略可能な hex color を自動修正する。`npm run verify:short-hex-colors` は未省略の hex color を検出する。`npm run fix:source-conventions` と `npm run verify:source-conventions` はこの検査を含めて実行する。

## JSX wrapper

複数要素を返すだけのラッパーは必ず `<>...</>` を使う。`Fragment` の明示使用は `key` が必要な `map` 内だけ許可する。`className` / `style` / `ref` / `onClick` / `role` / `aria-*` / `data-*` / layout が必要な場合だけ `div` などの実 DOM を使う。意味のないラッパー `div` は使わない。

単一要素だけを返すために `<>...</>` で囲むことは禁止する。この場合は子要素を直接返す。`Fragment` / `React.Fragment` の明示使用は、`map` 内で `key` を付ける必要がある場合だけ許可し、それ以外は `<>...</>` にする。`key` 以外の属性が必要な場合は Fragment ではなく、責務のある実 DOM または適切な component を使う。

JSX tag child 同士の間に空白だけの空行を入れない。`npm run fix:jsx-child-spacing` は対象の空行を1改行へ自動修正し、`npm run verify:jsx-child-spacing` は違反を検出する。

## 絵文字・pictographic symbol

絵文字・記号絵文字などの pictographic symbol をソースファイルへ直接書くことは禁止する。ただし、`src/components/ui/` 配下の UI コンポーネントは、絵文字選択 UI や callout の既定アイコンなど UI 表現そのものが責務になるため例外として許可する。

## 検証 script

検証スクリプトのエラーメッセージは日本語で直接定義する。英語のメッセージを出力してから翻訳用 runner や wrapper で変換することは禁止する。
