import { describe, expect, it } from "vitest";
import {
  buildDetailGridTemplateColumns,
  DETAIL_DEFAULT_COLUMN_ORDER,
  getDetailGridMinWidth,
  moveDetailColumnOrder,
  normalizeDetailColumnOrder,
  type ExplorerDetailColumnWidths,
} from "@/components/folder/components/detail-view/folderDetailColumns";

const columnWidths = {
  name: 320,
  tags: 190,
  path: 420,
  updatedAt: 168,
  sync: 132,
  kind: 128,
  size: 112,
} satisfies ExplorerDetailColumnWidths;

describe("folderDetailColumns", () => {
  it("列順の重複と未知の値を除去し、不足列を既定順で補完する", () => {
    expect(
      normalizeDetailColumnOrder(["size", "name", "name", "unknown", "sync"]),
    ).toEqual(["size", "name", "sync", "tags", "path", "updatedAt", "kind"]);
  });

  it("不正な列順は既定順に戻す", () => {
    expect(normalizeDetailColumnOrder(null)).toEqual([
      ...DETAIL_DEFAULT_COLUMN_ORDER,
    ]);
    expect(normalizeDetailColumnOrder({ name: true })).toEqual([
      ...DETAIL_DEFAULT_COLUMN_ORDER,
    ]);
  });

  it("指定列を対象indexへ移動できる", () => {
    expect(moveDetailColumnOrder(DETAIL_DEFAULT_COLUMN_ORDER, "size", 0)).toEqual(
      ["size", "name", "tags", "path", "updatedAt", "sync", "kind"],
    );

    expect(moveDetailColumnOrder(DETAIL_DEFAULT_COLUMN_ORDER, "name", 6)).toEqual(
      ["tags", "path", "updatedAt", "sync", "kind", "size", "name"],
    );
  });

  it("範囲外の対象indexは安全に丸める", () => {
    expect(moveDetailColumnOrder(DETAIL_DEFAULT_COLUMN_ORDER, "path", -100)).toEqual(
      ["path", "name", "tags", "updatedAt", "sync", "kind", "size"],
    );

    expect(
      moveDetailColumnOrder(DETAIL_DEFAULT_COLUMN_ORDER, "path", 100),
    ).toEqual(["name", "tags", "updatedAt", "sync", "kind", "size", "path"]);
  });

  it("列順を反映したgrid-template-columnsと最小幅を生成する", () => {
    const columnOrder = ["size", "name", "tags"] as const;

    expect(buildDetailGridTemplateColumns(columnWidths, columnOrder)).toBe(
      "112px 320px 190px 420px 168px 132px 128px",
    );
    expect(getDetailGridMinWidth(columnWidths, columnOrder)).toBe(1470);
  });
});
