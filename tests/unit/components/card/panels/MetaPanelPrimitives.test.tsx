// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  MetaPanelActionRow,
  MetaPanelInfoRow,
  MetaPanelInput,
  MetaPanelSectionActionButton,
  MetaPanelSectionHeader,
  MetaPanelSurfaceField,
  MetaPanelSwitchRow,
} from "@/components/card/panels/MetaPanelPrimitives";

describe("MetaPanelPrimitives", () => {
  it("keeps the shared panel styling contract in one place", () => {
    render(
      <>
        <MetaPanelActionRow>
          <MetaPanelInput aria-label="タイトル" placeholder="タイトル" />
        </MetaPanelActionRow>
        <MetaPanelSwitchRow label="下書き" checked={false} />
        <MetaPanelSectionHeader
          title="タグ管理"
          action={<MetaPanelSectionActionButton>設定で管理</MetaPanelSectionActionButton>}
        />
        <MetaPanelSurfaceField muted>タグを選択・追加</MetaPanelSurfaceField>
        <MetaPanelInfoRow label="作成日:" value="2026/04/16 07:42" />
      </>,
    );

    expect(screen.getByPlaceholderText("タイトル").className).toContain(
      "ds-editor-pane__input",
    );
    expect(screen.getByRole("switch", { name: "下書き" }).className).toContain(
      "ds-editor-pane__switch",
    );
    expect(screen.getByText("タグ管理").className).toContain(
      "ds-editor-pane__section-title",
    );
    expect(screen.getByText("設定で管理").className).toContain(
      "ds-editor-pane__section-action",
    );
    expect(screen.getByText("タグを選択・追加").className).toContain(
      "ds-editor-pane__surface-field",
    );
    expect(screen.getByText("作成日:").parentElement?.className).toContain(
      "ds-editor-pane__info-row",
    );
  });

  it("forwards switch changes through the shared meta panel wrapper", () => {
    const onCheckedChange = vi.fn();

    render(
      <MetaPanelSwitchRow
        label="下書き"
        checked={false}
        onCheckedChange={onCheckedChange}
      />,
    );

    fireEvent.click(screen.getByRole("switch", { name: "下書き" }));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
