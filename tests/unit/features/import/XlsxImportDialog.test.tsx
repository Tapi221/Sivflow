import { describe, expect, it } from "vitest";
import { XlsxImportDialog } from "@/chip/panel/dialog.desktop/Dialog.XlsxImport";

describe("XlsxImportDialog", () => {
  it("exports the panel dialog component", () => {
    expect(XlsxImportDialog).toBeTypeOf("function");
  });
});
