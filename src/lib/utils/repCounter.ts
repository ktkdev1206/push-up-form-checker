import type { RepCounterOutput } from '@/types/ui';
import type { FormAnalysis } from '@/types/pose';
import { REP_DEBOUNCE_MS, REPS_FOR_SUCCESS_AUDIO, AUDIO_DEBOUNCE_MS } from '@/lib/utils/constants';

type RepCounterState = 'WAITING_FOR_DOWN' | 'WAITING_FOR_UP';

// Rep counting thresholds
const STRICT_DOWN_THRESHOLD = 75; // elbow angle must go under this to be considered a real "down"
const UP_THRESHOLD = 155; // elbow angle must go above this to be considered "up"
const MIN_REP_INTERVAL = 300; // ms minimum between counted reps to avoid bounce

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
  private minElbowDuringDown: number | null = null;
  private lastRepTimestamp = 0;

  /**
   * Process a frame of form analysis
   * @param formAnalysis Current form analysis result
   * @param timestamp Current timestamp in milliseconds
   */
  processFrame(formAnalysis: FormAnalysis, timestamp: number): void {
    const currentElbowAngle = formAnalysis.elbowAngles.average;
    const previousState = this.state;
    const previousCorrectReps = this.correctReps;
    const previousIncorrectReps = this.incorrectReps;
    const now = timestamp;

    // Handle invalid form - increment error but don't reset cycle (MVP-friendly)
    if (formAnalysis.state === 'INVALID_FORM') {
      // Only increment incorrect reps if enough time has passed
      const timeSinceLastChange = now - this.lastStateChangeTime;
      if (timeSinceLastChange >= REP_DEBOUNCE_MS || this.lastStateChangeTime === 0) {
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
        });
      }

      return;
    }

    // Ignore partial reps and not detected states (but don't reset cycle)
    if (formAnalysis.state === 'PARTIAL_REP' || formAnalysis.state === 'NOT_DETECTED') {
      return;
    }

    // State machine transitions based on elbow angle
    if (this.state === 'WAITING_FOR_DOWN') {
      // Check if elbow angle goes below strict down threshold
      if (currentElbowAngle <= STRICT_DOWN_THRESHOLD) {
        this.state = 'WAITING_FOR_UP';
        this.minElbowDuringDown = currentElbowAngle;
        this.lastStateChangeTime = now;

        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('[RepCounter] State transition: WAITING_FOR_DOWN → WAITING_FOR_UP', {
            timestamp,
            currentElbowAngle,
            correctReps: this.correctReps,
          });
        }
      }
    } else if (this.state === 'WAITING_FOR_UP') {
      // Update minimum elbow angle during down phase
      this.minElbowDuringDown = Math.min(
        this.minElbowDuringDown ?? 999,
        currentElbowAngle
      );

      // Check if elbow angle goes above up threshold and enough time has passed
      if (
        currentElbowAngle >= UP_THRESHOLD &&
        (now - this.lastRepTimestamp) > MIN_REP_INTERVAL
      ) {
        // Store minElbowDuringDown before resetting for debug logging
        const minElbowValue = this.minElbowDuringDown;

        // Decide if rep is correct or incomplete
        if (
          this.minElbowDuringDown !== null &&
          this.minElbowDuringDown <= STRICT_DOWN_THRESHOLD
        ) {
          // Correct rep - went deep enough during down phase
          this.correctReps++;
          this.totalAttempts++;

          // Check if we should trigger success audio
          if (
            this.correctReps % REPS_FOR_SUCCESS_AUDIO === 0 &&
            timestamp - this.lastAudioTime >= AUDIO_DEBOUNCE_MS
          ) {
            this.lastAudioTrigger = 'SUCCESS';
            this.lastAudioTime = timestamp;
          }
        } else {
          // Incorrect rep - didn't go deep enough
          this.incorrectReps++;
          this.totalAttempts++;

          // Trigger failure audio (with debounce)
          if (timestamp - this.lastAudioTime >= AUDIO_DEBOUNCE_MS) {
            this.lastAudioTrigger = 'FAILURE';
            this.lastAudioTime = timestamp;
          }
        }

        // Reset state for next rep
        this.minElbowDuringDown = null;
        this.state = 'WAITING_FOR_DOWN';
        this.lastRepTimestamp = now;
        this.lastStateChangeTime = now;

        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('[RepCounter] ✅ REP COUNTED!', {
            correctReps: this.correctReps,
            incorrectReps: this.incorrectReps,
            totalAttempts: this.totalAttempts,
            minElbowDuringDown: minElbowValue,
            timestamp,
          });
        }
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
        currentElbowAngle,
        minElbowDuringDown: this.minElbowDuringDown,
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
    this.minElbowDuringDown = null;
    this.lastRepTimestamp = 0;
  }
}

