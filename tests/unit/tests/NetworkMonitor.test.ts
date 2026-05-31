// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
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

  describe("初期状態", () => {
    it("good ステータスで開始する", () => {
      expect(monitor.status).toBe("good");
    });
  });

  describe("状態遷移（ヒステリシス）", () => {
    it("失敗しきい値に達したら即座に poor へ下げる", () => {
      monitor.reportResult(false, 100);
      expect(monitor.status).toBe("good");

      monitor.reportResult(false, 100);
      expect(monitor.status).toBe("poor");
    });

    it("RTT が遅い場合は即座に poor へ下げる", () => {
      monitor.reportResult(true, 5000);
      expect(monitor.status).toBe("poor");
    });

    it("poor から good へ回復するには複数回の成功が必要", () => {
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

    it("excellent に到達するには厳密な条件が必要", () => {
      expect(monitor.status).toBe("good");

      for (let i = 0; i < 4; i++) {
        monitor.reportResult(true, 50);
        expect(monitor.status).toBe("good");
      }

      monitor.reportResult(true, 50);
      expect(monitor.status).toBe("excellent");
    });

    it("オフライン状態を検出する", () => {
      Object.defineProperty(window.navigator, "onLine", {
        value: false,
        configurable: true,
      });

      monitor.reportResult(false, 0);
      expect(monitor.status).toBe("offline");
    });

    it("リスナーへの通知を確認する", () => {
      const listener = vi.fn();
      monitor.subscribe(listener);

      monitor.reportResult(false, 100);
      monitor.reportResult(false, 100);

      expect(listener).toHaveBeenCalledWith("poor");
    });
  });

  describe("getBatchConstraint", () => {
    it("user_initiated 同期には最大リソースを与える", () => {
      const constraint = monitor.getBatchConstraint("user_initiated");
      expect(constraint).toEqual({
        maxSize: 100,
        concurrency: 3,
        timeoutMs: 30000,
      });
    });

    it("Good 状態のバックグラウンド同期には制限されたリソースを与える", () => {
      const constraint = monitor.getBatchConstraint("background");
      expect(constraint.maxSize).toBe(20);
      expect(constraint.concurrency).toBe(1);
    });

    it("Poor 状態では非常に制限されたリソースを与える", () => {
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

    it("Excellent 状態では高めの容量を許可する", () => {
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
