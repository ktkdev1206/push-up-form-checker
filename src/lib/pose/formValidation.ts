import type { PoseKeypoint, FormAnalysis, FormError } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';
import { calculateElbowAngles } from '@/lib/pose/angleCalculation';
import {
  ELBOW_ANGLE_DOWN_THRESHOLD,
  ELBOW_ANGLE_UP_THRESHOLD,
  HAND_WIDTH_TOLERANCE,
  BODY_ALIGNMENT_THRESHOLD,
  LANDMARK_VISIBILITY_THRESHOLD,
} from '@/lib/utils/constants';

// Module-level variable for debug logging (dev-only)
let lastFormLogTime = 0;

/**
 * Calculate distance between two points
 */
function distance(p1: PoseKeypoint, p2: PoseKeypoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get keypoint by landmark index, checking visibility
 */
function getKeypoint(
  keypoints: PoseKeypoint[],
  landmark: PoseLandmark
): PoseKeypoint | null {
  const keypoint = keypoints[landmark];
  if (!keypoint || keypoint.score < LANDMARK_VISIBILITY_THRESHOLD) {
    return null;
  }
  return keypoint;
}

/**
 * Calculate average confidence from keypoints
 */
function calculateConfidence(keypoints: PoseKeypoint[]): number {
  const requiredLandmarks = [
    PoseLandmark.LEFT_SHOULDER,
    PoseLandmark.RIGHT_SHOULDER,
    PoseLandmark.LEFT_ELBOW,
    PoseLandmark.RIGHT_ELBOW,
    PoseLandmark.LEFT_WRIST,
    PoseLandmark.RIGHT_WRIST,
    PoseLandmark.LEFT_HIP,
    PoseLandmark.RIGHT_HIP,
  ];

  const scores = requiredLandmarks
    .map((landmark) => keypoints[landmark]?.score ?? 0)
    .filter((score) => score >= LANDMARK_VISIBILITY_THRESHOLD);

  return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
}

/**
 * Validate hand width (wrist distance vs shoulder width)
 */
function validateHandWidth(
  leftShoulder: PoseKeypoint,
  rightShoulder: PoseKeypoint,
  leftWrist: PoseKeypoint,
  rightWrist: PoseKeypoint
): { width: number; correct: boolean; error: FormError | null } {
  const shoulderWidth = distance(leftShoulder, rightShoulder);
  const wristWidth = distance(leftWrist, rightWrist);

  if (shoulderWidth === 0) {
    return { width: 0, correct: false, error: null };
  }

  const widthRatio = wristWidth / shoulderWidth;
  const tolerance = HAND_WIDTH_TOLERANCE;
  const minRatio = 1 - tolerance;
  const maxRatio = 1 + tolerance;

  const correct = widthRatio >= minRatio && widthRatio <= maxRatio;

  // MVP-friendly: Hand width errors are warnings, not errors (don't block reps)
  const error: FormError | null = correct
    ? null
    : {
        type: 'HAND_WIDTH',
        message: widthRatio < minRatio
          ? 'Hands too close together'
          : 'Hands too far apart',
        severity: 'WARNING', // Changed from ERROR to WARNING
      };

  return { width: wristWidth, correct, error };
}

/**
 * Validate body alignment (hip-shoulder angle from horizontal)
 */
function validateBodyAlignment(
  leftShoulder: PoseKeypoint,
  rightShoulder: PoseKeypoint,
  leftHip: PoseKeypoint,
  rightHip: PoseKeypoint
): { angle: number; correct: boolean; error: FormError | null } {
  // Calculate shoulder midpoint
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;

  // Calculate hip midpoint
  const hipMidX = (leftHip.x + rightHip.x) / 2;
  const hipMidY = (leftHip.y + rightHip.y) / 2;

  // Calculate angle from horizontal
  const dx = hipMidX - shoulderMidX;
  const dy = hipMidY - shoulderMidY;

  // Angle from horizontal (0 = perfectly horizontal)
  const angleRadians = Math.atan2(Math.abs(dy), Math.abs(dx));
  const angleDegrees = (angleRadians * 180) / Math.PI;

  // For push-ups, we want body to be relatively straight
  // Calculate deviation from vertical (90 degrees)
  const deviationFromVertical = Math.abs(90 - angleDegrees);

  const correct = deviationFromVertical <= BODY_ALIGNMENT_THRESHOLD;

  // MVP-friendly: Body alignment errors are warnings, not errors (don't block reps)
  const error: FormError | null = correct
    ? null
    : {
        type: 'BODY_ALIGNMENT',
        message: 'Keep your body straight',
        severity: 'WARNING', // Changed from ERROR to WARNING
      };

  return { angle: deviationFromVertical, correct, error };
}

/**
 * Validate push-up form based on pose keypoints
 * @param keypoints Array of 33 pose keypoints
 * @returns Form analysis with state, angles, errors, and confidence
 */
export function validateForm(keypoints: PoseKeypoint[]): FormAnalysis {
  // Get required keypoints
  const leftShoulder = getKeypoint(keypoints, PoseLandmark.LEFT_SHOULDER);
  const rightShoulder = getKeypoint(keypoints, PoseLandmark.RIGHT_SHOULDER);
  const leftElbow = getKeypoint(keypoints, PoseLandmark.LEFT_ELBOW);
  const rightElbow = getKeypoint(keypoints, PoseLandmark.RIGHT_ELBOW);
  const leftWrist = getKeypoint(keypoints, PoseLandmark.LEFT_WRIST);
  const rightWrist = getKeypoint(keypoints, PoseLandmark.RIGHT_WRIST);
  const leftHip = getKeypoint(keypoints, PoseLandmark.LEFT_HIP);
  const rightHip = getKeypoint(keypoints, PoseLandmark.RIGHT_HIP);

  // Check if we have minimum required keypoints
  const requiredKeypoints = [
    leftShoulder,
    rightShoulder,
    leftElbow,
    rightElbow,
    leftWrist,
    rightWrist,
  ];

  if (requiredKeypoints.some((kp) => kp === null)) {
    return {
      state: 'NOT_DETECTED',
      elbowAngles: { left: 0, right: 0, average: 0 },
      handWidth: 0,
      handWidthCorrect: false,
      bodyAlignment: 0,
      bodyAlignmentCorrect: false,
      errors: [],
      confidence: calculateConfidence(keypoints),
    };
  }

  // Calculate elbow angles
  const elbowAngles = calculateElbowAngles(keypoints);

  // Validate hand width
  const handWidthValidation = validateHandWidth(
    leftShoulder!,
    rightShoulder!,
    leftWrist!,
    rightWrist!
  );

  // Validate body alignment
  const bodyAlignmentValidation =
    leftHip && rightHip
      ? validateBodyAlignment(leftShoulder!, rightShoulder!, leftHip, rightHip)
      : { angle: 0, correct: true, error: null };

  // Collect errors
  const errors: FormError[] = [];
  if (handWidthValidation.error) {
    errors.push(handWidthValidation.error);
  }
  if (bodyAlignmentValidation.error) {
    errors.push(bodyAlignmentValidation.error);
  }

  // Determine form state based on elbow angle
  // MVP-friendly: Only mark as INVALID_FORM if errors are severe (ERROR severity)
  // Allow VALID_UP/DOWN even with minor warnings (hand width/body alignment)
  const severeErrors = errors.filter((e) => e.severity === 'ERROR');
  
  let state: FormAnalysis['state'];
  if (elbowAngles.average === 0) {
    state = 'NOT_DETECTED';
  } else if (elbowAngles.average < ELBOW_ANGLE_DOWN_THRESHOLD) {
    // Down position - only invalid if severe errors
    state = severeErrors.length > 0 ? 'INVALID_FORM' : 'VALID_DOWN';
  } else if (elbowAngles.average > ELBOW_ANGLE_UP_THRESHOLD) {
    // Up position - only invalid if severe errors
    state = severeErrors.length > 0 ? 'INVALID_FORM' : 'VALID_UP';
  } else {
    // Between thresholds - partial rep
    state = 'PARTIAL_REP';
    errors.push({
      type: 'ROM_INCOMPLETE',
      message: 'Complete the full range of motion',
      severity: 'WARNING',
    });
  }

  const result = {
    state,
    elbowAngles,
    handWidth: handWidthValidation.width,
    handWidthCorrect: handWidthValidation.correct,
    bodyAlignment: bodyAlignmentValidation.angle,
    bodyAlignmentCorrect: bodyAlignmentValidation.correct,
    errors,
    confidence: calculateConfidence(keypoints),
  };

  // Debug logging (dev-only, sampled every ~1 second)
  if (process.env.NODE_ENV === 'development') {
    const now = Date.now();
    if (now - lastFormLogTime >= 1000) {
      // eslint-disable-next-line no-console
      console.log('[FormValidation] Form state sample', {
        state: result.state,
        elbowAngle: result.elbowAngles.average.toFixed(1),
        handWidthCorrect: result.handWidthCorrect,
        bodyAlignmentCorrect: result.bodyAlignmentCorrect,
        errors: result.errors.map((e) => `${e.type}(${e.severity})`),
        confidence: result.confidence.toFixed(2),
      });
      lastFormLogTime = now;
    }
  }

  return result;
}

