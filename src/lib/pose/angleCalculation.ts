import type { PoseKeypoint, ElbowAngles } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';
import { LANDMARK_VISIBILITY_THRESHOLD } from '@/lib/utils/constants';

/**
 * Calculate the distance between two points
 */
function distance(p1: PoseKeypoint, p2: PoseKeypoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle between three keypoints using law of cosines
 * Returns angle in degrees (0-180)
 * @param point1 First point
 * @param vertex Vertex point (angle is measured here)
 * @param point2 Second point
 * @returns Angle in degrees
 */
export function calculateAngle(
  point1: PoseKeypoint,
  vertex: PoseKeypoint,
  point2: PoseKeypoint
): number {
  // Calculate side lengths
  const a = distance(vertex, point1);
  const b = distance(vertex, point2);
  const c = distance(point1, point2);

  // Handle edge cases
  if (a === 0 || b === 0) {
    return 0;
  }

  // Law of cosines: angle = arccos((a² + b² - c²) / (2ab))
  const cosAngle = (a * a + b * b - c * c) / (2 * a * b);

  // Clamp to valid range [-1, 1] to avoid NaN from arccos
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));

  // Convert to degrees
  const angleRadians = Math.acos(clampedCos);
  const angleDegrees = (angleRadians * 180) / Math.PI;

  return angleDegrees;
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
 * Calculate elbow angles for both arms
 * @param keypoints Array of 33 pose keypoints
 * @returns Elbow angles for left, right, and average
 */
export function calculateElbowAngles(keypoints: PoseKeypoint[]): ElbowAngles {
  // Get required keypoints
  const leftShoulder = getKeypoint(keypoints, PoseLandmark.LEFT_SHOULDER);
  const rightShoulder = getKeypoint(keypoints, PoseLandmark.RIGHT_SHOULDER);
  const leftElbow = getKeypoint(keypoints, PoseLandmark.LEFT_ELBOW);
  const rightElbow = getKeypoint(keypoints, PoseLandmark.RIGHT_ELBOW);
  const leftWrist = getKeypoint(keypoints, PoseLandmark.LEFT_WRIST);
  const rightWrist = getKeypoint(keypoints, PoseLandmark.RIGHT_WRIST);

  // Calculate left elbow angle
  let leftAngle = 0;
  if (leftShoulder && leftElbow && leftWrist) {
    leftAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  }

  // Calculate right elbow angle
  let rightAngle = 0;
  if (rightShoulder && rightElbow && rightWrist) {
    rightAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  }

  // Calculate average
  const average =
    leftAngle > 0 && rightAngle > 0
      ? (leftAngle + rightAngle) / 2
      : leftAngle > 0
        ? leftAngle
        : rightAngle > 0
          ? rightAngle
          : 0;

  return {
    left: leftAngle,
    right: rightAngle,
    average,
  };
}

