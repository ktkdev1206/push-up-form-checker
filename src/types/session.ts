export interface SessionStats {
  totalReps: number;
  correctReps: number;
  incorrectReps: number;
  duration: number; // in seconds
  errors: string[];
}

export interface SessionData extends SessionStats {
  id?: string;
  userId?: string;
  startedAt: Date;
  endedAt?: Date;
}

export interface ErrorBreakdown {
  elbowAngle: number;
  handWidth: number;
  bodyAlignment: number;
  romIncomplete: number;
}

export interface SessionSummary {
  correctReps: number;
  incorrectReps: number;
  totalReps: number;
  successRate: number; // percentage
  duration: number; // seconds
  errorBreakdown: ErrorBreakdown;
  isPersonalBest: boolean;
}

