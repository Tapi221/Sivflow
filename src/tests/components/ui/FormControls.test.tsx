// @vitest-environment jsdom
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("form control primitives", () => {
  it("applies token-backed classes to input, checkbox, switch, and label", () => {
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
    expect(screen.getByRole("checkbox", { name: "Accept" }).className).toContain(
      "ds-checkbox",
    );
    expect(screen.getByRole("switch", { name: "Enabled" }).className).toContain(
      "ds-switch",
    );
  });

  it("keeps select on the shared token-backed contract", () => {
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
