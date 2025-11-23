import type { RepCounterOutput } from '@/types/ui';
import type { FormAnalysis } from '@/types/pose';
import { REP_DEBOUNCE_MS, REPS_FOR_SUCCESS_AUDIO, AUDIO_DEBOUNCE_MS } from '@/lib/utils/constants';

type RepCounterState = 'WAITING_FOR_DOWN' | 'WAITING_FOR_UP';

/**
 * Rep counter state machine for tracking push-up reps
 * Implements debouncing and audio trigger logic
 */
export class RepCounter {
  private state: RepCounterState = 'WAITING_FOR_DOWN';
  private correctReps = 0;
  private incorrectReps = 0;
  private totalAttempts = 0;
  private lastStateChangeTime = 0;
  private lastAudioTrigger: 'SUCCESS' | 'FAILURE' | 'NONE' = 'NONE';
  private lastAudioTime = 0;

  /**
   * Process a frame of form analysis
   * @param formAnalysis Current form analysis result
   * @param timestamp Current timestamp in milliseconds
   */
  processFrame(formAnalysis: FormAnalysis, timestamp: number): void {
    const { state: formState } = formAnalysis;
    const previousState = this.state;
    const previousCorrectReps = this.correctReps;
    const previousIncorrectReps = this.incorrectReps;

    // Check debounce for state changes (only for transitions, not for invalid form)
    const timeSinceLastChange = timestamp - this.lastStateChangeTime;
    const shouldDebounce = timeSinceLastChange < REP_DEBOUNCE_MS && this.lastStateChangeTime > 0;

    // Handle invalid form - increment error but don't reset cycle (MVP-friendly)
    if (formState === 'INVALID_FORM') {
      // Only increment incorrect reps if debounce allows
      if (!shouldDebounce) {
        this.incorrectReps++;
        this.totalAttempts++;
        this.lastStateChangeTime = timestamp;

        // Trigger failure audio (with debounce)
        if (timestamp - this.lastAudioTime >= AUDIO_DEBOUNCE_MS) {
          this.lastAudioTrigger = 'FAILURE';
          this.lastAudioTime = timestamp;
        }
      }

      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('[RepCounter] INVALID_FORM detected', {
          state: this.state,
          correctReps: this.correctReps,
          incorrectReps: this.incorrectReps,
          timestamp,
          debounced: shouldDebounce,
        });
      }

      return;
    }

    // Ignore partial reps and not detected states (but don't reset cycle)
    if (formState === 'PARTIAL_REP' || formState === 'NOT_DETECTED') {
      return;
    }

    // Apply debounce only to valid state transitions
    if (shouldDebounce && (formState === 'VALID_DOWN' || formState === 'VALID_UP')) {
      return;
    }

    // State machine transitions
    if (this.state === 'WAITING_FOR_DOWN' && formState === 'VALID_DOWN') {
      this.state = 'WAITING_FOR_UP';
      this.lastStateChangeTime = timestamp;

      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('[RepCounter] State transition: WAITING_FOR_DOWN → WAITING_FOR_UP', {
          timestamp,
          correctReps: this.correctReps,
        });
      }
    } else if (this.state === 'WAITING_FOR_UP' && formState === 'VALID_UP') {
      // Complete rep!
      this.correctReps++;
      this.totalAttempts++;
      this.state = 'WAITING_FOR_DOWN';
      this.lastStateChangeTime = timestamp;

      // Check if we should trigger success audio
      if (
        this.correctReps % REPS_FOR_SUCCESS_AUDIO === 0 &&
        timestamp - this.lastAudioTime >= AUDIO_DEBOUNCE_MS
      ) {
        this.lastAudioTrigger = 'SUCCESS';
        this.lastAudioTime = timestamp;
      }

      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('[RepCounter] ✅ REP COUNTED!', {
          correctReps: this.correctReps,
          incorrectReps: this.incorrectReps,
          totalAttempts: this.totalAttempts,
          timestamp,
        });
      }
    }

    // Log state changes for debugging
    if (
      process.env.NODE_ENV === 'development' &&
      (previousState !== this.state ||
        previousCorrectReps !== this.correctReps ||
        previousIncorrectReps !== this.incorrectReps)
    ) {
      // eslint-disable-next-line no-console
      console.log('[RepCounter] State/Count changed', {
        previousState,
        newState: this.state,
        formState,
        previousCorrectReps,
        newCorrectReps: this.correctReps,
        previousIncorrectReps,
        newIncorrectReps: this.incorrectReps,
        timestamp,
      });
    }
  }

  /**
   * Get current rep counts
   */
  getCounts(): { correctReps: number; incorrectReps: number; totalAttempts: number } {
    return {
      correctReps: this.correctReps,
      incorrectReps: this.incorrectReps,
      totalAttempts: this.totalAttempts,
    };
  }

  /**
   * Get output including audio trigger
   */
  getOutput(): RepCounterOutput {
    const counts = this.getCounts();
    const audioTrigger = this.lastAudioTrigger;

    // Reset audio trigger after reading
    this.lastAudioTrigger = 'NONE';

    return {
      ...counts,
      audioTrigger,
    };
  }

  /**
   * Reset all counters and state
   */
  reset(): void {
    this.state = 'WAITING_FOR_DOWN';
    this.correctReps = 0;
    this.incorrectReps = 0;
    this.totalAttempts = 0;
    this.lastStateChangeTime = 0;
    this.lastAudioTrigger = 'NONE';
    this.lastAudioTime = 0;
  }
}

