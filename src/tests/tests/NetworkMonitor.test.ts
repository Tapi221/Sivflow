// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NetworkMonitor } from "@/services/logic/NetworkMonitor";

describe("NetworkMonitor", () => {
  let monitor: NetworkMonitor;

  beforeEach(() => {
    monitor = new NetworkMonitor();

    Object.defineProperty(window.navigator, "onLine", {
      value: true,
      configurable: true,
    });
  });

  describe("Initial State", () => {
    it('should start with "good" status', () => {
      expect(monitor.status).toBe("good");
    });
  });

  describe("State Transitions (Hysteresis)", () => {
    it('should degrade to "poor" immediately upon failure threshold', () => {
      monitor.reportResult(false, 100);
      expect(monitor.status).toBe("good");

      monitor.reportResult(false, 100);
      expect(monitor.status).toBe("poor");
    });

    it('should degrade to "poor" immediately upon slow RTT', () => {
      monitor.reportResult(true, 5000);
      expect(monitor.status).toBe("poor");
    });

    it('should require multiple successes to recover from "poor" to "good"', () => {
      monitor.reportResult(false, 100);
      monitor.reportResult(false, 100);
      expect(monitor.status).toBe("poor");

      monitor.reportResult(true, 100);
      expect(monitor.status).toBe("poor");

      monitor.reportResult(true, 100);
      expect(monitor.status).toBe("poor");

      monitor.reportResult(true, 100);
      expect(monitor.status).toBe("good");
    });

    it('should require strict conditions to reach "excellent"', () => {
      expect(monitor.status).toBe("good");

      for (let i = 0; i < 4; i++) {
        monitor.reportResult(true, 50);
        expect(monitor.status).toBe("good");
      }

      monitor.reportResult(true, 50);
      expect(monitor.status).toBe("excellent");
    });

    it("should detect offline status", () => {
      Object.defineProperty(window.navigator, "onLine", {
        value: false,
        configurable: true,
      });

      monitor.reportResult(false, 0);
      expect(monitor.status).toBe("offline");
    });

    it("should verify notifications to listeners", () => {
      const listener = vi.fn();
      monitor.subscribe(listener);

      monitor.reportResult(false, 100);
      monitor.reportResult(false, 100);

      expect(listener).toHaveBeenCalledWith("poor");
    });
  });

  describe("getBatchConstraint", () => {
    it("should give max resources for user_initiated sync", () => {
      const constraint = monitor.getBatchConstraint("user_initiated");
      expect(constraint).toEqual({
        maxSize: 100,
        concurrency: 3,
        timeoutMs: 30000,
      });
    });

    it("should give limited resources for background sync (based on Good status)", () => {
      const constraint = monitor.getBatchConstraint("background");
      expect(constraint.maxSize).toBe(20);
      expect(constraint.concurrency).toBe(1);
    });

    it("should give extremely limited resources for Poor status", () => {
      monitor.reportResult(false, 100);
      monitor.reportResult(false, 100);
      expect(monitor.status).toBe("poor");

      const constraint = monitor.getBatchConstraint("auto_save");
      expect(constraint).toEqual({
        maxSize: 10,
        concurrency: 1,
        timeoutMs: 10000,
      });
    });

    it("should allow higher capacity for Excellent status", () => {
      for (let i = 0; i < 5; i++) monitor.reportResult(true, 50);
      expect(monitor.status).toBe("excellent");

      const constraint = monitor.getBatchConstraint("auto_save");
      expect(constraint).toEqual({
        maxSize: 50,
        concurrency: 2,
        timeoutMs: 20000,
      });
    });
  });
});
