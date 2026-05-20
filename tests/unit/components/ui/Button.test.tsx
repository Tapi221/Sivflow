// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button, buttonVariants } from "@/components/ui/button";

describe("Button", () => {
  it("keeps the default public variant contract while using token classes", () => {
    render(<Button>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });

    expect(button.className).toContain("ds-button");
    expect(button.className).toContain("ds-button--default");
  });

  it("preserves the exported variant names", () => {
    expect(buttonVariants({ variant: "secondary", size: "sm" })).toContain(
      "ds-button--secondary",
    );
  });
});
