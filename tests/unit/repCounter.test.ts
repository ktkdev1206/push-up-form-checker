import { RepCounter } from '@/lib/utils/repCounter';
import type { FormAnalysis } from '@/types/pose';
import { REP_DEBOUNCE_MS, REPS_FOR_SUCCESS_AUDIO } from '@/lib/utils/constants';

describe('RepCounter', () => {
  let repCounter: RepCounter;

  beforeEach(() => {
    repCounter = new RepCounter();
  });

  const createFormAnalysis = (state: FormAnalysis['state']): FormAnalysis => ({
    state,
    elbowAngles: { left: 90, right: 90, average: 90 },
    handWidth: 0.4,
    handWidthCorrect: true,
    bodyAlignment: 5,
    bodyAlignmentCorrect: true,
    errors: [],
    confidence: 0.9,
  });

  describe('processFrame', () => {
    it('should count a complete rep (UP -> DOWN -> UP)', () => {
      // Start in UP position
      repCounter.processFrame(createFormAnalysis('VALID_UP'), 0);
      expect(repCounter.getCounts().correctReps).toBe(0);

      // Move to DOWN position
      repCounter.processFrame(createFormAnalysis('VALID_DOWN'), 100);
      expect(repCounter.getCounts().correctReps).toBe(0);

      // Move back to UP position - rep complete!
      repCounter.processFrame(createFormAnalysis('VALID_UP'), 200);
      expect(repCounter.getCounts().correctReps).toBe(1);
      expect(repCounter.getCounts().totalAttempts).toBe(1);
    });

    it('should not count rep if form is invalid', () => {
      repCounter.processFrame(createFormAnalysis('VALID_UP'), 0);
      repCounter.processFrame(createFormAnalysis('INVALID_FORM'), 100);
      repCounter.processFrame(createFormAnalysis('VALID_UP'), 200);

      expect(repCounter.getCounts().correctReps).toBe(0);
      expect(repCounter.getCounts().incorrectReps).toBe(1);
    });

    it('should not reset cycle on invalid form (MVP-friendly)', () => {
      repCounter.processFrame(createFormAnalysis('VALID_UP'), 0);
      repCounter.processFrame(createFormAnalysis('VALID_DOWN'), REP_DEBOUNCE_MS + 10);
      repCounter.processFrame(createFormAnalysis('INVALID_FORM'), REP_DEBOUNCE_MS * 2 + 20);

      // MVP-friendly: Cycle is NOT reset, so next UP can still complete the rep
      repCounter.processFrame(createFormAnalysis('VALID_UP'), REP_DEBOUNCE_MS * 3 + 30);
      expect(repCounter.getCounts().correctReps).toBe(1);
      expect(repCounter.getCounts().incorrectReps).toBe(1);
    });

    it('should debounce rapid state changes', () => {
      const now = Date.now();
      repCounter.processFrame(createFormAnalysis('VALID_UP'), now);
      repCounter.processFrame(createFormAnalysis('VALID_DOWN'), now + 50); // too fast
      repCounter.processFrame(createFormAnalysis('VALID_UP'), now + 100); // too fast

      expect(repCounter.getCounts().correctReps).toBe(0);
    });

    it('should allow rep after debounce period', () => {
      const now = Date.now();
      repCounter.processFrame(createFormAnalysis('VALID_UP'), now);
      repCounter.processFrame(createFormAnalysis('VALID_DOWN'), now + REP_DEBOUNCE_MS + 10);
      repCounter.processFrame(createFormAnalysis('VALID_UP'), now + REP_DEBOUNCE_MS * 2 + 20);

      expect(repCounter.getCounts().correctReps).toBe(1);
    });

    it('should trigger SUCCESS audio every N correct reps', () => {
      for (let i = 0; i < REPS_FOR_SUCCESS_AUDIO; i++) {
        const timestamp = i * 1000;
        repCounter.processFrame(createFormAnalysis('VALID_UP'), timestamp);
        repCounter.processFrame(createFormAnalysis('VALID_DOWN'), timestamp + REP_DEBOUNCE_MS + 10);
        repCounter.processFrame(createFormAnalysis('VALID_UP'), timestamp + REP_DEBOUNCE_MS * 2 + 20);
      }

      const output = repCounter.getOutput();
      expect(output.audioTrigger).toBe('SUCCESS');
      expect(output.correctReps).toBe(REPS_FOR_SUCCESS_AUDIO);
    });

    it('should trigger FAILURE audio immediately on invalid form', () => {
      repCounter.processFrame(createFormAnalysis('VALID_UP'), 0);
      repCounter.processFrame(createFormAnalysis('INVALID_FORM'), 100);

      const output = repCounter.getOutput();
      expect(output.audioTrigger).toBe('FAILURE');
    });

    it('should not trigger audio if debounced', () => {
      const now = Date.now();
      repCounter.processFrame(createFormAnalysis('INVALID_FORM'), now);
      repCounter.processFrame(createFormAnalysis('INVALID_FORM'), now + 100); // too fast

      const output = repCounter.getOutput();
      expect(output.audioTrigger).toBe('NONE');
    });

    it('should handle PARTIAL_REP state', () => {
      repCounter.processFrame(createFormAnalysis('VALID_UP'), 0);
      repCounter.processFrame(createFormAnalysis('PARTIAL_REP'), 100);
      repCounter.processFrame(createFormAnalysis('VALID_UP'), 200);

      // Partial rep should not complete the cycle
      expect(repCounter.getCounts().correctReps).toBe(0);
    });

    it('should handle NOT_DETECTED state', () => {
      repCounter.processFrame(createFormAnalysis('VALID_UP'), 0);
      repCounter.processFrame(createFormAnalysis('NOT_DETECTED'), 100);
      repCounter.processFrame(createFormAnalysis('VALID_UP'), 200);

      // Not detected should not complete the cycle
      expect(repCounter.getCounts().correctReps).toBe(0);
    });

    it('should count exactly 1 rep for sequence [UP, DOWN, DOWN, UP, UP]', () => {
      const baseTime = Date.now();
      repCounter.processFrame(createFormAnalysis('VALID_UP'), baseTime);
      repCounter.processFrame(createFormAnalysis('VALID_DOWN'), baseTime + REP_DEBOUNCE_MS + 10);
      repCounter.processFrame(createFormAnalysis('VALID_DOWN'), baseTime + REP_DEBOUNCE_MS * 2 + 20); // Still down
      repCounter.processFrame(createFormAnalysis('VALID_UP'), baseTime + REP_DEBOUNCE_MS * 3 + 30);
      repCounter.processFrame(createFormAnalysis('VALID_UP'), baseTime + REP_DEBOUNCE_MS * 4 + 40); // Still up

      expect(repCounter.getCounts().correctReps).toBe(1);
      expect(repCounter.getCounts().totalAttempts).toBe(1);
    });

    it('should not count reps for sequences with only INVALID_FORM', () => {
      const baseTime = Date.now();
      repCounter.processFrame(createFormAnalysis('INVALID_FORM'), baseTime);
      repCounter.processFrame(createFormAnalysis('INVALID_FORM'), baseTime + REP_DEBOUNCE_MS + 10);
      repCounter.processFrame(createFormAnalysis('INVALID_FORM'), baseTime + REP_DEBOUNCE_MS * 2 + 20);

      expect(repCounter.getCounts().correctReps).toBe(0);
      expect(repCounter.getCounts().incorrectReps).toBeGreaterThan(0);
    });

    it('should not count reps for sequences with only PARTIAL_REP', () => {
      const baseTime = Date.now();
      repCounter.processFrame(createFormAnalysis('PARTIAL_REP'), baseTime);
      repCounter.processFrame(createFormAnalysis('PARTIAL_REP'), baseTime + 100);
      repCounter.processFrame(createFormAnalysis('PARTIAL_REP'), baseTime + 200);

      expect(repCounter.getCounts().correctReps).toBe(0);
    });

    it('should count correct reps even with occasional bad frames', () => {
      const baseTime = Date.now();
      // First rep
      repCounter.processFrame(createFormAnalysis('VALID_UP'), baseTime);
      repCounter.processFrame(createFormAnalysis('VALID_DOWN'), baseTime + REP_DEBOUNCE_MS + 10);
      repCounter.processFrame(createFormAnalysis('INVALID_FORM'), baseTime + REP_DEBOUNCE_MS * 2 + 20); // Bad frame
      repCounter.processFrame(createFormAnalysis('VALID_UP'), baseTime + REP_DEBOUNCE_MS * 3 + 30); // Complete rep

      // Second rep
      repCounter.processFrame(createFormAnalysis('VALID_DOWN'), baseTime + REP_DEBOUNCE_MS * 4 + 40);
      repCounter.processFrame(createFormAnalysis('VALID_UP'), baseTime + REP_DEBOUNCE_MS * 5 + 50); // Complete rep

      expect(repCounter.getCounts().correctReps).toBe(2);
      expect(repCounter.getCounts().incorrectReps).toBeGreaterThan(0); // At least 1 from the bad frame
    });
  });

  describe('reset', () => {
    it('should reset all counters', () => {
      repCounter.processFrame(createFormAnalysis('VALID_UP'), 0);
      repCounter.processFrame(createFormAnalysis('VALID_DOWN'), 100);
      repCounter.processFrame(createFormAnalysis('VALID_UP'), 200);

      expect(repCounter.getCounts().correctReps).toBe(1);

      repCounter.reset();
      const counts = repCounter.getCounts();

      expect(counts.correctReps).toBe(0);
      expect(counts.incorrectReps).toBe(0);
      expect(counts.totalAttempts).toBe(0);
    });
  });
});

