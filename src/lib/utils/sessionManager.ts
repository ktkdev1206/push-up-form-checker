import type { SessionData, SessionSummary, ErrorBreakdown } from '@/types/session';
import type { FormError } from '@/types/pose';

/**
 * Session state manager for tracking workout session data
 */
export class SessionManager {
  private session: SessionData = {
    totalReps: 0,
    correctReps: 0,
    incorrectReps: 0,
    duration: 0,
    errors: [],
    startedAt: new Date(),
  };

  /**
   * Start a new session
   */
  startSession(): void {
    this.session = {
      totalReps: 0,
      correctReps: 0,
      incorrectReps: 0,
      duration: 0,
      errors: [],
      startedAt: new Date(),
    };
  }

  /**
   * Update rep counts
   */
  updateReps(correctReps: number, incorrectReps: number): void {
    this.session.correctReps = correctReps;
    this.session.incorrectReps = incorrectReps;
    this.session.totalReps = correctReps + incorrectReps;
  }

  /**
   * Add a form error to the session
   */
  addError(error: FormError): void {
    this.session.errors.push(error.type);
  }

  /**
   * End the session and calculate final statistics
   */
  endSession(): void {
    const now = new Date();
    const durationMs = now.getTime() - this.session.startedAt.getTime();
    this.session.duration = Math.floor(durationMs / 1000); // Convert to seconds
    this.session.endedAt = now;
  }

  /**
   * Get current session data
   */
  getSession(): SessionData {
    return { ...this.session };
  }

  /**
   * Get session summary with calculated statistics
   */
  getSummary(): SessionSummary {
    const { correctReps, incorrectReps, totalReps, errors } = this.session;

    // Calculate success rate
    const successRate =
      totalReps > 0 ? Math.round((correctReps / totalReps) * 100) : 0;

    // Calculate error breakdown
    const errorBreakdown: ErrorBreakdown = {
      elbowAngle: errors.filter((e) => e === 'ELBOW_ANGLE').length,
      handWidth: errors.filter((e) => e === 'HAND_WIDTH').length,
      bodyAlignment: errors.filter((e) => e === 'BODY_ALIGNMENT').length,
      romIncomplete: errors.filter((e) => e === 'ROM_INCOMPLETE').length,
    };

    // TODO: Implement personal best check (requires comparing with previous sessions)
    const isPersonalBest = false;

    return {
      correctReps,
      incorrectReps,
      totalReps,
      successRate,
      duration: this.session.duration,
      errorBreakdown,
      isPersonalBest,
    };
  }

  /**
   * Reset session (for testing or cleanup)
   */
  reset(): void {
    this.startSession();
  }
}

