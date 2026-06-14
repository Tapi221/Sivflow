// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToggleSwitch } from "@/chip/toggle/Toggle.switch";
import { Checkbox } from "@/chip/ui/checkbox";
import { Input } from "@/chip/ui/input";
import { Label } from "@/chip/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/chip/ui/select";

describe("form control primitives", () => {
  it("input、checkbox、label に token-backed class を適用し、toggle を操作可能にする", () => {
    render(
      <>
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Name" />
        <Checkbox aria-label="Accept" />
        <ToggleSwitch>
          <span>Enabled</span>
        </ToggleSwitch>
      </>,
    );

    expect(screen.getByText("Name").className).toContain("ds-label");
    expect(screen.getByPlaceholderText("Name").className).toContain("ds-input");
    expect(
      screen.getByRole("checkbox", { name: "Accept" }).className,
    ).toContain("ds-checkbox");
    expect(screen.getByRole("checkbox", { name: "Enabled" })).toBeInTheDocument();
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
