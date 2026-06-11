import type { ImportIssue, ParsedImportRow } from "@/features/import/domain/import.types";



const buildIssue = ({
  level,
  code,
  sheetName,
  rowNumber,
  columnKey,
  message,
}: ImportIssue): ImportIssue => {
  return {
    level,
    code,
    sheetName,
    rowNumber,
    columnKey,
    message,
  };
};
const groupParsedRowsToCards = (rows: ParsedImportRow[]) => {
  const issues: ImportIssue[] = [];
  const cardMap = new Map<
    string,
    {
      title?: string;
      frontRows: ParsedImportRow[];
      backRows: ParsedImportRow[];
    }
  >();

  rows.forEach((parsedRow) => {
    const existing = cardMap.get(parsedRow.cardId);

    if ((existing === null || existing === undefined)) {
      cardMap.set(parsedRow.cardId, {
        title: parsedRow.title,
        frontRows: parsedRow.side === "front" ? [parsedRow] : [],
        backRows: parsedRow.side === "back" ? [parsedRow] : [],
      });
      return;
    }

    if (
      parsedRow.title &&
      existing.title &&
      parsedRow.title !== existing.title
    ) {
      issues.push(
        buildIssue({
          level: "warning",
          code: "mixed_title_in_same_card",
          sheetName: parsedRow.sheetName,
          rowNumber: parsedRow.rowNumber,
          columnKey: "title",
          message: `同じ cardId="${parsedRow.cardId}" 内で title が一致していません。先に出現した title を採用します。`,
        }),
      );
    }

    if (!existing.title && parsedRow.title) {
      existing.title = parsedRow.title;
    }

    if (parsedRow.side === "front") {
      existing.frontRows.push(parsedRow);
      return;
    }

    existing.backRows.push(parsedRow);
  });

  const cards = Array.from(cardMap.entries()).map(([cardId, value]) => {
    (["front", "back"] as const).forEach((side) => {
      const seenOrders = new Set<number>();
      const sideRows = side === "front" ? value.frontRows : value.backRows;

      sideRows.forEach((parsedRow) => {
        if (seenOrders.has(parsedRow.block.order)) {
          issues.push(
            buildIssue({
              level: "error",
              code: "duplicate_block_order",
              sheetName: parsedRow.sheetName,
              rowNumber: parsedRow.rowNumber,
              columnKey: "blockOrder",
              message: `cardId="${cardId}" の ${side} 側で blockOrder=${parsedRow.block.order} が重複しています。`,
            }),
          );
          return;
        }

        seenOrders.add(parsedRow.block.order);
      });
    });

    return {
      cardId,
      title: value.title,
      frontBlocks: [...value.frontRows]
        .sort((left, right) => left.block.order - right.block.order)
        .map((parsedRow) => parsedRow.block),
      backBlocks: [...value.backRows]
        .sort((left, right) => left.block.order - right.block.order)
        .map((parsedRow) => parsedRow.block),
    };
  });

  return {
    cards,
    issues,
  };
};



export { groupParsedRowsToCards };
