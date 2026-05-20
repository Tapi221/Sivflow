import { describe, expect, it } from "vitest";

import {
  applyExplorerDetailOptimisticOrder,
  buildExplorerDetailOrderScopeKeyByKind,
  type ExplorerDetailOptimisticOrderState,
  getExplorerDetailOptimisticOrderKey,
  pruneResolvedExplorerDetailOptimisticOrder,
} from "@/components/folder/components/detail-view/folderDetailOptimisticOrder";
import type {
  ExplorerDetailRow,
  ExplorerDetailRowKind,
} from "@/components/folder/explorer/model/detailRows";

const createRow = (
  kind: ExplorerDetailRowKind,
  id: string,
): ExplorerDetailRow =>
  ({
    key: `${kind}:${id}`,
    kind,
    id,
    name: id,
    tags: [],
    path: "",
    updatedAt: null,
    updatedAtMs: 0,
    typeLabel: kind,
    sizeBytes: null,
    orderIndex: 0,
    selectTarget: null,
    openFolderId: null,
    openCardSetId: null,
    syncEntity: kind,
    syncTargetId: id,
  }) as ExplorerDetailRow;

describe("folderDetailOptimisticOrder", () => {
  it("同一スコープの同一kindだけを楽観順に並び替える", () => {
    const rows = [
      createRow("folder", "folder-a"),
      createRow("folder", "folder-b"),
      createRow("cardSet", "set-a"),
      createRow("cardSet", "set-b"),
      createRow("document", "doc-a"),
    ];
    const scopeKeys = buildExplorerDetailOrderScopeKeyByKind({
      currentFolderId: "folder-root",
      currentCardSetId: null,
    });
    const optimisticOrder: ExplorerDetailOptimisticOrderState = {
      [getExplorerDetailOptimisticOrderKey("folder", scopeKeys.folder)]: {
        operationId: 1,
        orderedIds: ["folder-b", "folder-a"],
      },
    };

    const nextRows = applyExplorerDetailOptimisticOrder({
      rows,
      optimisticOrderByKey: optimisticOrder,
      orderScopeKeyByKind: scopeKeys,
    });

    expect(nextRows.map((row) => row.id)).toEqual([
      "folder-b",
      "folder-a",
      "set-a",
      "set-b",
      "doc-a",
    ]);
  });

  it("別スコープの楽観順は現在の行に適用しない", () => {
    const rows = [
      createRow("document", "doc-a"),
      createRow("document", "doc-b"),
    ];
    const currentScopeKeys = buildExplorerDetailOrderScopeKeyByKind({
      currentFolderId: "folder-current",
      currentCardSetId: null,
    });
    const otherScopeKeys = buildExplorerDetailOrderScopeKeyByKind({
      currentFolderId: "folder-other",
      currentCardSetId: null,
    });
    const optimisticOrder: ExplorerDetailOptimisticOrderState = {
      [getExplorerDetailOptimisticOrderKey(
        "document",
        otherScopeKeys.document,
      )]: {
        operationId: 1,
        orderedIds: ["doc-b", "doc-a"],
      },
    };

    const nextRows = applyExplorerDetailOptimisticOrder({
      rows,
      optimisticOrderByKey: optimisticOrder,
      orderScopeKeyByKind: currentScopeKeys,
    });

    expect(nextRows.map((row) => row.id)).toEqual(["doc-a", "doc-b"]);
  });

  it("永続化済みの楽観順だけを掃除し、未反映の楽観順は残す", () => {
    const resolvedRows = [
      createRow("card", "card-b"),
      createRow("card", "card-a"),
    ];
    const unresolvedRows = [
      createRow("card", "card-a"),
      createRow("card", "card-b"),
    ];
    const scopeKeys = buildExplorerDetailOrderScopeKeyByKind({
      currentFolderId: null,
      currentCardSetId: "set-1",
    });
    const orderKey = getExplorerDetailOptimisticOrderKey(
      "card",
      scopeKeys.card,
    );
    const optimisticOrder: ExplorerDetailOptimisticOrderState = {
      [orderKey]: {
        operationId: 1,
        orderedIds: ["card-b", "card-a"],
      },
    };

    expect(
      pruneResolvedExplorerDetailOptimisticOrder({
        rows: unresolvedRows,
        optimisticOrderByKey: optimisticOrder,
        orderScopeKeyByKind: scopeKeys,
      }),
    ).toEqual(optimisticOrder);

    expect(
      pruneResolvedExplorerDetailOptimisticOrder({
        rows: resolvedRows,
        optimisticOrderByKey: optimisticOrder,
        orderScopeKeyByKind: scopeKeys,
      }),
    ).toEqual({});
  });

  it("楽観順に存在しない新規行は現在の末尾に残す", () => {
    const rows = [
      createRow("folder", "folder-a"),
      createRow("folder", "folder-b"),
      createRow("folder", "folder-c"),
    ];
    const scopeKeys = buildExplorerDetailOrderScopeKeyByKind({
      currentFolderId: null,
      currentCardSetId: null,
    });
    const optimisticOrder: ExplorerDetailOptimisticOrderState = {
      [getExplorerDetailOptimisticOrderKey("folder", scopeKeys.folder)]: {
        operationId: 1,
        orderedIds: ["folder-b", "folder-a"],
      },
    };

    const nextRows = applyExplorerDetailOptimisticOrder({
      rows,
      optimisticOrderByKey: optimisticOrder,
      orderScopeKeyByKind: scopeKeys,
    });

    expect(nextRows.map((row) => row.id)).toEqual([
      "folder-b",
      "folder-a",
      "folder-c",
    ]);
  });
});
