import { describe, expect, it } from "vitest";
import {
  buildDetailGridTemplateColumns,
  DETAIL_DEFAULT_COLUMN_ORDER,
  getDetailGridMinWidth,
  moveDetailColumnToIndex,
  normalizeDetailColumnOrder,
  type ExplorerDetailColumnWidths,
} from "@/components/folder/components/detail-view/folderDetailColumns";

const widths = {
  name: 320,
  tags: 190,
  path: 420,
  updatedAt: 168,
  sync: 132,
  kind: 128,
  size: 112,
} satisfies ExplorerDetailColumnWidths;

describe("folderDetailColumns", () => {
  it("保存済み列順の未知列と重複列を捨て、不足列を末尾に補完する", () => {
    expect(
      normalizeDetailColumnOrder(["sync", "name", "sync", "unknown", "tags"]),
    ).toEqual(["sync", "name", "tags", "path", "updatedAt", "kind", "size"]);
  });

  it("保存済み列順が壊れている場合はデフォルト順に戻す", () => {
    expect(normalizeDetailColumnOrder({ name: true })).toEqual([
      ...DETAIL_DEFAULT_COLUMN_ORDER,
    ]);
  });

  it("列をドロップ先の列位置へ移動できる", () => {
    expect(
      moveDetailColumnToIndex(DETAIL_DEFAULT_COLUMN_ORDER, "sync", "tags"),
    ).toEqual(["name", "sync", "tags", "path", "updatedAt", "kind", "size"]);
  });

  it("同じ列へ移動した場合は正規化済みの現在順を返す", () => {
    expect(
      moveDetailColumnToIndex(DETAIL_DEFAULT_COLUMN_ORDER, "name", "name"),
    ).toEqual([...DETAIL_DEFAULT_COLUMN_ORDER]);
  });

  it("grid-template-columnsを列順どおりに組み立てる", () => {
    const order = [
      "sync",
      "name",
      "size",
      "tags",
      "path",
      "updatedAt",
      "kind",
    ] as const;

    expect(buildDetailGridTemplateColumns(widths, order)).toBe(
      "132px 320px 112px 190px 420px 168px 128px",
    );
    expect(getDetailGridMinWidth(widths, order)).toBe(1470);
  });
});
