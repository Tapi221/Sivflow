// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NetworkMonitor } from '../services/logic/NetworkMonitor';

describe('NetworkMonitor', () => {
  let monitor: NetworkMonitor;
  
  // Create a subclass to access protected/private members for testing if necessary,
  // or just test public interface. NetworkMonitor implementation allows black-box testing.
  
  beforeEach(() => {
    monitor = new NetworkMonitor();
    
    // Mock navigator.onLine
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true
    });
  });

  describe('Initial State', () => {
    it('should start with "good" status', () => {
      expect(monitor.status).toBe('good');
    });
  });

  describe('State Transitions (Hysteresis)', () => {
    it('should degrade to "poor" immediately upon failure threshold', () => {
      // THRESHOLDS.POOR_ERROR_RATE is not directly controllable via reportResult(false),
      // but consecutiveFailures >= 2 triggers poor.
      
      monitor.reportResult(false, 100); // 1st failure
      expect(monitor.status).toBe('good'); // Still good
      
      monitor.reportResult(false, 100); // 2nd failure
      expect(monitor.status).toBe('poor'); // Degraded
    });

    it('should degrade to "poor" immediately upon slow RTT', () => {
      monitor.reportResult(true, 5000); // RTT > 2000ms
      expect(monitor.status).toBe('poor');
    });

    it('should require multiple successes to recover from "poor" to "good"', () => {
      // First, set to poor
      monitor.reportResult(false, 100);
      monitor.reportResult(false, 100);
      expect(monitor.status).toBe('poor');

      // Recover attempts (THRESHOLD: 3 successes)
      monitor.reportResult(true, 100);
      expect(monitor.status).toBe('poor'); // 1/3
      
      monitor.reportResult(true, 100);
      expect(monitor.status).toBe('poor'); // 2/3
      
      monitor.reportResult(true, 100);
      expect(monitor.status).toBe('good'); // 3/3 -> Recovered!
    });

    it('should require strict conditions to reach "excellent"', () => {
      // Start from good
      expect(monitor.status).toBe('good');

      // THRESHOLD: 5 successes + RTT < 100ms
      for (let i = 0; i < 4; i++) {
        monitor.reportResult(true, 50);
        expect(monitor.status).toBe('good'); // Not yet
      }

      monitor.reportResult(true, 50);
      expect(monitor.status).toBe('excellent'); // 5th success
    });

    it('should detect offline status', () => {
      Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
      
      // Trigger update
      monitor.reportResult(false, 0); 
      expect(monitor.status).toBe('offline');
    });

    it('should verify notifications to listeners', () => {
      const listener = vi.fn();
      monitor.subscribe(listener);

      // Trigger transition good -> poor
      monitor.reportResult(false, 100);
      monitor.reportResult(false, 100);
      
      expect(listener).toHaveBeenCalledWith('poor');
    });
  });

  describe('getBatchConstraint', () => {
    it('should give max resources for user_initiated sync', () => {
      const constraint = monitor.getBatchConstraint('user_initiated');
      expect(constraint).toEqual({
        maxSize: 100,
        concurrency: 3,
        timeoutMs: 30000
      });
    });

    it('should give limited resources for background sync (based on Good status)', () => {
      // Default status is Good
      const constraint = monitor.getBatchConstraint('background');
      expect(constraint.maxSize).toBe(20); // capped at 20
      expect(constraint.concurrency).toBe(1);
    });

    it('should give extremely limited resources for Poor status', () => {
      // Force poor
      monitor.reportResult(false, 100);
      monitor.reportResult(false, 100);
      expect(monitor.status).toBe('poor');

      const constraint = monitor.getBatchConstraint('auto_save'); // Context other than user_initiated/background
      expect(constraint).toEqual({
        maxSize: 10,
        concurrency: 1,
        timeoutMs: 10000
      });
    });

    it('should allow higher capacity for Excellent status', () => {
      // Force excellent
      for (let i = 0; i < 5; i++) monitor.reportResult(true, 50);
      expect(monitor.status).toBe('excellent');

      const constraint = monitor.getBatchConstraint('auto_save');
      expect(constraint).toEqual({
        maxSize: 50,
        concurrency: 2,
        timeoutMs: 20000
      });
    });
  });
});
