// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
  return {
    bindUser: vi.fn((_userId: string | null) => {}),
    reset: vi.fn(() => {}),
    processQueue: vi.fn(async () => {}),
    triggerProcess: vi.fn((_delayMs?: number) => {}),
  };
});

vi.mock("@/services/operationQueue", () => ({
  operationQueue: {
    bindUser: state.bindUser,
    reset: state.reset,
    processQueue: state.processQueue,
    triggerProcess: state.triggerProcess,
  },
}));

import {
  initializeOperationQueue,
  resetOperationQueue,
} from "@/utils/queueUtils";

describe("queueUtils", () => {
  beforeEach(() => {
    resetOperationQueue();
    state.bindUser.mockReset();
    state.reset.mockReset();
    state.processQueue.mockReset().mockResolvedValue(undefined);
    state.triggerProcess.mockReset();
  });

  it("binds the user and schedules queue processing only once for the same user", async () => {
    await initializeOperationQueue("user-1");
    await initializeOperationQueue("user-1");

    expect(state.bindUser).toHaveBeenCalledTimes(1);
    expect(state.bindUser).toHaveBeenCalledWith("user-1");
    expect(state.triggerProcess).toHaveBeenCalledTimes(1);
  });

  it("resets the bound queue state", async () => {
    await initializeOperationQueue("user-2");

    resetOperationQueue();

    expect(state.reset).toHaveBeenCalledTimes(1);
  });

  it("catches failures from the online event handler", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    state.processQueue.mockRejectedValueOnce(new Error("boom"));

    await initializeOperationQueue("user-3");
    window.dispatchEvent(new Event("online"));

    await Promise.resolve();
    await Promise.resolve();

    expect(errorSpy).toHaveBeenCalledWith(
      "[Queue] Online-triggered processQueue failed",
      expect.any(Error),
    );

    errorSpy.mockRestore();
  });
});
