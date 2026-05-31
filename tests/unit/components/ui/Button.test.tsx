// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, buttonVariants } from "@/components/ui/button";

describe("Button", () => {
  it("token class を使用しつつ default public variant contract を維持する", () => {
    render(<Button>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });

    expect(button.className).toContain("ds-button");
    expect(button.className).toContain("ds-button--default");
  });

  it("export された variant 名を保持する", () => {
    expect(buttonVariants({ variant: "secondary", size: "sm" })).toContain(
      "ds-button--secondary",
    );
  });
});
