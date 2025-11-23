import { validateForm } from '@/lib/pose/formValidation';
import type { PoseKeypoint, FormAnalysis } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';
import {
  ELBOW_ANGLE_DOWN_THRESHOLD,
  ELBOW_ANGLE_UP_THRESHOLD,
  HAND_WIDTH_TOLERANCE,
  BODY_ALIGNMENT_THRESHOLD,
} from '@/lib/utils/constants';

describe('formValidation', () => {
  const createKeypoint = (
    x: number,
    y: number,
    score: number = 1
  ): PoseKeypoint => ({
    x,
    y,
    score,
    name: 'test',
  });

  const createValidKeypoints = (elbowAngle: number): PoseKeypoint[] => {
    const keypoints: PoseKeypoint[] = new Array(33).fill(null).map((_, i) => ({
      x: 0,
      y: 0,
      score: 0,
      name: `point_${i}`,
    }));

    // Set up a valid push-up pose
    // Shoulders at top
    keypoints[PoseLandmark.LEFT_SHOULDER] = createKeypoint(0.3, 0.2);
    keypoints[PoseLandmark.RIGHT_SHOULDER] = createKeypoint(0.7, 0.2);

    // Elbows - position based on desired angle
    const elbowY = 0.2 + Math.sin((elbowAngle * Math.PI) / 180) * 0.2;
    keypoints[PoseLandmark.LEFT_ELBOW] = createKeypoint(0.35, elbowY);
    keypoints[PoseLandmark.RIGHT_ELBOW] = createKeypoint(0.65, elbowY);

    // Wrists - below elbows
    keypoints[PoseLandmark.LEFT_WRIST] = createKeypoint(0.3, 0.5);
    keypoints[PoseLandmark.RIGHT_WRIST] = createKeypoint(0.7, 0.5);

    // Hips - aligned with shoulders
    keypoints[PoseLandmark.LEFT_HIP] = createKeypoint(0.3, 0.6);
    keypoints[PoseLandmark.RIGHT_HIP] = createKeypoint(0.7, 0.6);

    return keypoints;
  };

  describe('validateForm', () => {
    it('should return VALID_DOWN when elbow angle is below threshold', () => {
      const keypoints = createValidKeypoints(ELBOW_ANGLE_DOWN_THRESHOLD - 10);
      const result = validateForm(keypoints);

      expect(result.state).toBe('VALID_DOWN');
      expect(result.errors).toHaveLength(0);
    });

    it('should return VALID_UP when elbow angle is above threshold', () => {
      const keypoints = createValidKeypoints(ELBOW_ANGLE_UP_THRESHOLD + 10);
      const result = validateForm(keypoints);

      expect(result.state).toBe('VALID_UP');
      expect(result.errors).toHaveLength(0);
    });

    it('should return PARTIAL_REP when angle is between thresholds', () => {
      const midAngle = (ELBOW_ANGLE_DOWN_THRESHOLD + ELBOW_ANGLE_UP_THRESHOLD) / 2;
      const keypoints = createValidKeypoints(midAngle);
      const result = validateForm(keypoints);

      expect(result.state).toBe('PARTIAL_REP');
    });

    it('should detect hand width warning when wrists are too close (but still VALID_UP)', () => {
      const keypoints = createValidKeypoints(ELBOW_ANGLE_UP_THRESHOLD + 10);
      // Make wrists too close together
      keypoints[PoseLandmark.LEFT_WRIST] = createKeypoint(0.45, 0.5);
      keypoints[PoseLandmark.RIGHT_WRIST] = createKeypoint(0.55, 0.5);

      const result = validateForm(keypoints);

      // MVP-friendly: Hand width errors are warnings, not errors, so state is still VALID_UP
      expect(result.state).toBe('VALID_UP');
      expect(result.handWidthCorrect).toBe(false);
      expect(result.errors.some((e) => e.type === 'HAND_WIDTH' && e.severity === 'WARNING')).toBe(true);
    });

    it('should detect hand width warning when wrists are too far (but still VALID_UP)', () => {
      const keypoints = createValidKeypoints(ELBOW_ANGLE_UP_THRESHOLD + 10);
      // Make wrists too far apart
      keypoints[PoseLandmark.LEFT_WRIST] = createKeypoint(0.1, 0.5);
      keypoints[PoseLandmark.RIGHT_WRIST] = createKeypoint(0.9, 0.5);

      const result = validateForm(keypoints);

      // MVP-friendly: Hand width errors are warnings, not errors, so state is still VALID_UP
      expect(result.state).toBe('VALID_UP');
      expect(result.handWidthCorrect).toBe(false);
      expect(result.errors.some((e) => e.type === 'HAND_WIDTH' && e.severity === 'WARNING')).toBe(true);
    });

    it('should detect body alignment warning when body is not straight (but still VALID_UP)', () => {
      const keypoints = createValidKeypoints(ELBOW_ANGLE_UP_THRESHOLD + 10);
      // Tilt the body by moving one hip up
      keypoints[PoseLandmark.LEFT_HIP] = createKeypoint(0.3, 0.5);
      keypoints[PoseLandmark.RIGHT_HIP] = createKeypoint(0.7, 0.7);

      const result = validateForm(keypoints);

      // MVP-friendly: Body alignment errors are warnings, not errors, so state is still VALID_UP
      expect(result.state).toBe('VALID_UP');
      expect(result.bodyAlignmentCorrect).toBe(false);
      expect(result.errors.some((e) => e.type === 'BODY_ALIGNMENT' && e.severity === 'WARNING')).toBe(true);
    });

    it('should return NOT_DETECTED when keypoints are missing', () => {
      const keypoints: PoseKeypoint[] = new Array(33).fill(null).map((_, i) => ({
        x: 0,
        y: 0,
        score: 0.3, // below threshold
        name: `point_${i}`,
      }));

      const result = validateForm(keypoints);

      expect(result.state).toBe('NOT_DETECTED');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should calculate confidence based on landmark visibility', () => {
      const keypoints = createValidKeypoints(ELBOW_ANGLE_UP_THRESHOLD + 10);
      // Reduce visibility of some keypoints
      keypoints[PoseLandmark.LEFT_ELBOW].score = 0.6;
      keypoints[PoseLandmark.RIGHT_ELBOW].score = 0.6;

      const result = validateForm(keypoints);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should return correct hand width value', () => {
      const keypoints = createValidKeypoints(ELBOW_ANGLE_UP_THRESHOLD + 10);
      const result = validateForm(keypoints);

      expect(result.handWidth).toBeGreaterThan(0);
      expect(typeof result.handWidth).toBe('number');
    });

    it('should return correct body alignment angle', () => {
      const keypoints = createValidKeypoints(ELBOW_ANGLE_UP_THRESHOLD + 10);
      const result = validateForm(keypoints);

      expect(result.bodyAlignment).toBeGreaterThanOrEqual(0);
      expect(result.bodyAlignment).toBeLessThanOrEqual(90);
    });
  });
});

