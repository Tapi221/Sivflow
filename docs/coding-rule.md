# Coding Rule

## import とファイル構造

import パスがズレている時、互換パスを追加することは禁止する。互換用の再 export や別名入口を増やさず、呼び出し元の import パスを正しい責務の module へ修正する。

import は複数行に展開せず、各 import 文を1行にまとめる。同一階層の参照は相対パスを使用し、階層をまたぐ参照は @/ エイリアスを使用する。

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

## 空行

import 文同士の間に空行を入れない。

同じブロック内の top-level 文同士にも空行を入れない。型定義同士、定数同士、helper 関数同士、component 同士、memo / displayName / export 同士は連続して記述する。

import、型定義、定数、helper 関数、component 本体、memo / displayName / export の各ブロック間だけ、空行1行を入れる。ブロック間の空行なし、または空行2行以上は禁止する。

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

`npm run lint`、`npm run lint:fix`、`npm run fix:source-conventions` は、source 規約の空行を自動で正規化する。自動整形 script が import 間だけを直して、同じブロック内またはブロック間の余分な空行を残す状態は禁止する。

import 間の空行検査と自動修正は、import 文直前の空白・改行も対象に含める。AST の `getFullStart()` だけを基準にして import 前の空行を取り逃がす実装は禁止する。

`verify:*` は検査だけを行い、ファイルを書き換える処理は `fix:*` にだけ置く。

## 定数

モジュールスコープの固定値・設定値として定義する `const` は、大文字 + アンダースコアの `UPPER_SNAKE_CASE` にする。対象は定数ブロックに置く値で、関数内の一時変数、`const helper = (...) => ...` のような helper 関数、component / memo / displayName / export 用の識別子は対象外とする。

## JSX wrapper

複数要素を返すだけのラッパーは必ず `<>...</>` を使う。`Fragment` の明示使用は `key` が必要な `map` 内だけ許可する。`className` / `style` / `ref` / `onClick` / `role` / `aria-*` / `data-*` / layout が必要な場合だけ `div` などの実 DOM を使う。意味のないラッパー `div` は使わない。

単一要素だけを返すために `<>...</>` で囲むことは禁止する。この場合は子要素を直接返す。`Fragment` / `React.Fragment` の明示使用は、`map` 内で `key` を付ける必要がある場合だけ許可し、それ以外は `<>...</>` にする。`key` 以外の属性が必要な場合は Fragment ではなく、責務のある実 DOM または適切な component を使う。

## 絵文字・pictographic symbol

絵文字・記号絵文字などの pictographic symbol をソースファイルへ直接書くことは禁止する。ただし、`src/components/ui/` 配下の UI コンポーネントは、絵文字選択 UI や callout の既定アイコンなど UI 表現そのものが責務になるため例外として許可する。

## 検証 script

検証スクリプトのエラーメッセージは日本語で直接定義する。英語のメッセージを出力してから翻訳用 runner や wrapper で変換することは禁止する。
