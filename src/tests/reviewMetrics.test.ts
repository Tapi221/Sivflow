import { calculateRetentionProbability, calculateResistanceScore } from '../utils/reviewMetrics';
import { getStabilityPhase, normalizeMemoryStability } from '../utils/reviewUtils';

describe('Review Metrics', () => {
    
    // Test Case: Retention behavior
    test('Retention Probability decreases as Interval increases (for fixed S)', () => {
        const S = 0.5; // Fixed stability
        
        const ret1 = calculateRetentionProbability(S, 1);
        const ret10 = calculateRetentionProbability(S, 10);
        const ret30 = calculateRetentionProbability(S, 30);
        
        console.log(`Retention S=0.5: 1day=${ret1}%, 10days=${ret10}%, 30days=${ret30}%`);
        
        expect(ret1).toBeGreaterThan(ret10);
        expect(ret10).toBeGreaterThan(ret30);
    });

    // Test Case: Resistance behavior
    test('Resistance Score increases as Interval increases', () => {
        const res1 = calculateResistanceScore(1);
        const res10 = calculateResistanceScore(10);
        const res90 = calculateResistanceScore(90);

        console.log(`Resistance: 1day=${res1}, 10days=${res10}, 90days=${res90}`);

        expect(res10).toBeGreaterThan(res1);
        expect(res90).toBeGreaterThan(res10);
        expect(res90).toBe(100); // Max cap
    });

    test('Resistance boundary and representative values', () => {
        // Boundary: zero and negative interval -> 0
        expect(calculateResistanceScore(0)).toBe(0);
        expect(calculateResistanceScore(-5)).toBe(0);

        // Max boundary
        expect(calculateResistanceScore(90)).toBe(100);

        // Representative approximate values (allow small rounding window)
        const r1 = calculateResistanceScore(1);
        const r7 = calculateResistanceScore(7);
        const r30 = calculateResistanceScore(30);

        expect(r1).toBeGreaterThanOrEqual(14);
        expect(r1).toBeLessThanOrEqual(16);

        expect(r7).toBeGreaterThanOrEqual(44);
        expect(r7).toBeLessThanOrEqual(48);

        expect(r30).toBeGreaterThanOrEqual(74);
        expect(r30).toBeLessThanOrEqual(78);
    });

    // Test Case: Phase Classification
    test('Stability Phase classifies based on Retention Probability', () => {
        // Mock S=1.0 (Strong internal stability)
        const S = 1.0; 
        
        // At 1 day interval, Retention should be high -> Solid or Stable
        // P = e^(-1/100) ~ 99%
        const phaseShort = getStabilityPhase(S, 1);
        expect(phaseShort.key).toBe('solid'); // > 85%

        // At very long interval, Retention drops -> Lower phase
        // P = e^(-120/100) = e^-1.2 ~ 30% -> Fragile
        const phaseLong = getStabilityPhase(S, 120);
        expect(phaseLong.key).toBe('fragile'); // 20-40%
        
        console.log(`Phase S=1.0: 1day=${phaseShort.label}, 120days=${phaseLong.label}`);
    });
});
