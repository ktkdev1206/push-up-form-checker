import { SessionManager } from '@/lib/utils/sessionManager';
import type { FormError } from '@/types/pose';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  describe('startSession', () => {
    it('should initialize session with start time', () => {
      const beforeStart = Date.now();
      sessionManager.startSession();
      const afterStart = Date.now();

      const session = sessionManager.getSession();
      expect(session.startedAt.getTime()).toBeGreaterThanOrEqual(beforeStart);
      expect(session.startedAt.getTime()).toBeLessThanOrEqual(afterStart);
    });

    it('should reset all counters when starting new session', () => {
      sessionManager.startSession();
      sessionManager.updateReps(5, 2);
      sessionManager.endSession();

      sessionManager.startSession();
      const session = sessionManager.getSession();

      expect(session.correctReps).toBe(0);
      expect(session.incorrectReps).toBe(0);
      expect(session.totalReps).toBe(0);
    });
  });

  describe('updateReps', () => {
    it('should update rep counts', () => {
      sessionManager.startSession();
      sessionManager.updateReps(3, 1);

      const session = sessionManager.getSession();
      expect(session.correctReps).toBe(3);
      expect(session.incorrectReps).toBe(1);
      expect(session.totalReps).toBe(4);
    });
  });

  describe('addError', () => {
    it('should track form errors', () => {
      sessionManager.startSession();
      const error: FormError = {
        type: 'ELBOW_ANGLE',
        message: 'Elbows too wide',
        severity: 'ERROR',
      };

      sessionManager.addError(error);
      const session = sessionManager.getSession();

      expect(session.errors).toHaveLength(1);
      expect(session.errors[0]).toBe('ELBOW_ANGLE');
    });

    it('should track multiple errors', () => {
      sessionManager.startSession();
      sessionManager.addError({
        type: 'ELBOW_ANGLE',
        message: 'Elbows too wide',
        severity: 'ERROR',
      });
      sessionManager.addError({
        type: 'HAND_WIDTH',
        message: 'Hands too close',
        severity: 'ERROR',
      });

      const session = sessionManager.getSession();
      expect(session.errors).toHaveLength(2);
    });
  });

  describe('endSession', () => {
    it('should calculate duration correctly', () => {
      sessionManager.startSession();
      const startTime = sessionManager.getSession().startedAt.getTime();

      // Simulate 5 seconds passing
      jest.spyOn(Date, 'now').mockReturnValue(startTime + 5000);

      sessionManager.endSession();
      const session = sessionManager.getSession();

      expect(session.duration).toBe(5);
      expect(session.endedAt).toBeDefined();

      jest.restoreAllMocks();
    });

    it('should calculate summary statistics', () => {
      sessionManager.startSession();
      sessionManager.updateReps(8, 2);
      sessionManager.addError({ type: 'ELBOW_ANGLE', message: 'test', severity: 'ERROR' });
      sessionManager.addError({ type: 'HAND_WIDTH', message: 'test', severity: 'ERROR' });

      const summary = sessionManager.getSummary();

      expect(summary.correctReps).toBe(8);
      expect(summary.incorrectReps).toBe(2);
      expect(summary.totalReps).toBe(10);
      expect(summary.successRate).toBe(80); // 8/10 * 100
      expect(summary.errorBreakdown.elbowAngle).toBe(1);
      expect(summary.errorBreakdown.handWidth).toBe(1);
    });
  });

  describe('getSummary', () => {
    it('should return correct success rate', () => {
      sessionManager.startSession();
      sessionManager.updateReps(7, 3);
      sessionManager.endSession();

      const summary = sessionManager.getSummary();
      expect(summary.successRate).toBe(70); // 7/10 * 100
    });

    it('should return 0 success rate when no reps', () => {
      sessionManager.startSession();
      sessionManager.endSession();

      const summary = sessionManager.getSummary();
      expect(summary.successRate).toBe(0);
    });

    it('should calculate error breakdown correctly', () => {
      sessionManager.startSession();
      sessionManager.addError({ type: 'ELBOW_ANGLE', message: 'test', severity: 'ERROR' });
      sessionManager.addError({ type: 'ELBOW_ANGLE', message: 'test', severity: 'ERROR' });
      sessionManager.addError({ type: 'HAND_WIDTH', message: 'test', severity: 'ERROR' });
      sessionManager.addError({ type: 'BODY_ALIGNMENT', message: 'test', severity: 'ERROR' });
      sessionManager.endSession();

      const summary = sessionManager.getSummary();
      expect(summary.errorBreakdown.elbowAngle).toBe(2);
      expect(summary.errorBreakdown.handWidth).toBe(1);
      expect(summary.errorBreakdown.bodyAlignment).toBe(1);
      expect(summary.errorBreakdown.romIncomplete).toBe(0);
    });
  });
});

