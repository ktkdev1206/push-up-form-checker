export type UserAction = 'FIND_OUT' | 'PUSS_OUT';

export interface LandingPageAction {
  action: UserAction;
  timestamp: number;
}

export type RepCounterState = 'WAITING_FOR_DOWN' | 'WAITING_FOR_UP';

export interface RepCounterOutput {
  correctReps: number;
  incorrectReps: number;
  totalAttempts: number;
  audioTrigger: 'SUCCESS' | 'FAILURE' | 'NONE';
}

export interface WorkoutOverlayState {
  repCount: number;
  formState: 'VALID_UP' | 'VALID_DOWN' | 'INVALID_FORM' | 'PARTIAL_REP' | 'NOT_DETECTED';
  errorMessage: string | null;
  showError: boolean;
}

