import { describe, expect, it } from "vitest";

import {
  clientPointToPaperPoint,
  paperPointToCanvasPoint,
  squaredDistance,
} from "@/utils/inkCoords";

describe("inkCoords", () => {
  it("converts client coordinates to normalized paper coordinates", () => {
    const point = clientPointToPaperPoint(250, 300, {
      left: 50,
      top: 100,
      width: 400,
      height: 400,
    });

    expect(point.x).toBeCloseTo(500, 4);
    expect(point.y).toBeCloseTo(707, 0);
    expect(point.p).toBe(0.5);
  });

  it("clamps coordinates into paper bounds", () => {
    const point = clientPointToPaperPoint(-100, 9999, {
      left: 0,
      top: 0,
      width: 500,
      height: 500,
    });

    expect(point.x).toBe(0);
    expect(point.y).toBe(1414);
  });

  it("maps paper points to canvas pixels", () => {
    const point = paperPointToCanvasPoint({ x: 500, y: 707 }, 1000, 1414);
    expect(point.x).toBeCloseTo(500, 4);
    expect(point.y).toBeCloseTo(707, 4);
  });

  it("computes squared distance", () => {
    expect(squaredDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25);
  });
});



