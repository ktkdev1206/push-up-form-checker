export interface PoseKeypoint {
  x: number;
  y: number;
  z?: number;
  score: number;
  name: string;
}

export interface Pose {
  keypoints: PoseKeypoint[];
  score: number;
}

export interface PoseDetectionResult {
  poses: Pose[];
  timestamp: number;
}

// MediaPipe landmark indices
export enum PoseLandmark {
  LEFT_SHOULDER = 11,
  RIGHT_SHOULDER = 12,
  LEFT_ELBOW = 13,
  RIGHT_ELBOW = 14,
  LEFT_WRIST = 15,
  RIGHT_WRIST = 16,
  LEFT_HIP = 23,
  RIGHT_HIP = 24,
}

export interface ElbowAngles {
  left: number;
  right: number;
  average: number;
}

export type FormState = 'VALID_UP' | 'VALID_DOWN' | 'INVALID_FORM' | 'PARTIAL_REP' | 'NOT_DETECTED';

export type FormErrorType = 'ELBOW_ANGLE' | 'HAND_WIDTH' | 'BODY_ALIGNMENT' | 'ROM_INCOMPLETE';

export interface FormError {
  type: FormErrorType;
  message: string;
  severity: 'WARNING' | 'ERROR';
}

export interface FormAnalysis {
  state: FormState;
  elbowAngles: ElbowAngles;
  handWidth: number;
  handWidthCorrect: boolean;
  bodyAlignment: number; // angle from horizontal in degrees
  bodyAlignmentCorrect: boolean;
  errors: FormError[];
  confidence: number; // 0-1 based on landmark visibility
}

