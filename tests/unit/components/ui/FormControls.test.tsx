// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

describe("form control primitives", () => {
  it("input、checkbox、switch、label に token-backed class を適用する", () => {
    render(
      <>
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Name" />
        <Checkbox aria-label="Accept" />
        <Switch aria-label="Enabled" />
      </>,
    );

    expect(screen.getByText("Name").className).toContain("ds-label");
    expect(screen.getByPlaceholderText("Name").className).toContain("ds-input");
    expect(
      screen.getByRole("checkbox", { name: "Accept" }).className,
    ).toContain("ds-checkbox");
    expect(screen.getByRole("switch", { name: "Enabled" }).className).toContain(
      "ds-switch",
    );
  });

  it("select を共有 token-backed contract に保つ", () => {
    render(
      <Select>
        <SelectTrigger aria-label="Sort">
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(screen.getByRole("combobox", { name: "Sort" }).className).toContain(
      "ds-select__trigger",
    );
  });
});
