// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

describe("platform smoke", () => {
  it("runs", () => {
    expect(vi).toBeDefined();
  });
});

