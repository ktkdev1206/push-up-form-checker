import type { CameraConfig, CameraSetupState } from '@/types/camera';
import type { PoseKeypoint } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';
import {
  IDEAL_CAMERA_WIDTH,
  IDEAL_CAMERA_HEIGHT,
  MIN_CAMERA_WIDTH,
  MIN_CAMERA_HEIGHT,
  TARGET_FPS_DESKTOP,
  TARGET_FPS_MOBILE,
  SHOULDER_CENTER_MIN,
  SHOULDER_CENTER_MAX,
  SHOULDER_WIDTH_MIN,
  SHOULDER_WIDTH_MAX,
  LANDMARK_VISIBILITY_THRESHOLD,
} from '@/lib/utils/constants';

export interface CameraPermissionResult {
  stream: MediaStream | null;
  error: 'PERMISSION_DENIED' | 'NO_CAMERA' | 'UNKNOWN_ERROR' | null;
}

/**
 * Check if camera API is available
 */
function isCameraAvailable(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices !== undefined &&
    navigator.mediaDevices.getUserMedia !== undefined
  );
}

/**
 * Check if running on HTTPS or localhost
 */
function isSecureContext(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return (
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

/**
 * Request camera permission and get media stream
 */
export async function requestCameraPermission(): Promise<CameraPermissionResult> {
  // eslint-disable-next-line no-console
  console.log('[camera.ts] requestCameraPermission() called');
  
  // Check if camera API is available
  if (!isCameraAvailable()) {
    // eslint-disable-next-line no-console
    console.error('[camera.ts] Camera API not available. Browser may not support getUserMedia.');
    // eslint-disable-next-line no-console
    console.error('[camera.ts] Navigator check:', typeof navigator !== 'undefined');
    // eslint-disable-next-line no-console
    console.error('[camera.ts] MediaDevices check:', typeof navigator !== 'undefined' && navigator.mediaDevices !== undefined);
    return { stream: null, error: 'UNKNOWN_ERROR' };
  }

  // eslint-disable-next-line no-console
  console.log('[camera.ts] Camera API is available');

  // Check if running on secure context (HTTPS or localhost)
  if (!isSecureContext()) {
    // eslint-disable-next-line no-console
    console.error('[camera.ts] Camera access requires HTTPS or localhost');
    // eslint-disable-next-line no-console
    console.error('[camera.ts] Current protocol:', typeof window !== 'undefined' ? window.location.protocol : 'N/A');
    // eslint-disable-next-line no-console
    console.error('[camera.ts] Current hostname:', typeof window !== 'undefined' ? window.location.hostname : 'N/A');
    return {
      stream: null,
      error: 'UNKNOWN_ERROR',
    };
  }

  // eslint-disable-next-line no-console
  console.log('[camera.ts] Secure context check passed');

  const constraints = {
    video: {
      facingMode: 'user',
      width: { ideal: IDEAL_CAMERA_WIDTH, min: MIN_CAMERA_WIDTH },
      height: { ideal: IDEAL_CAMERA_HEIGHT, min: MIN_CAMERA_HEIGHT },
      frameRate: { ideal: TARGET_FPS_DESKTOP, min: TARGET_FPS_MOBILE },
    },
  };

  // eslint-disable-next-line no-console
  console.log('[camera.ts] Calling getUserMedia with constraints:', JSON.stringify(constraints, null, 2));

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    // eslint-disable-next-line no-console
    console.log('[camera.ts] getUserMedia succeeded!');
    // eslint-disable-next-line no-console
    console.log('[camera.ts] Stream obtained:', {
      id: stream.id,
      active: stream.active,
      tracks: stream.getTracks().length,
    });
    return { stream, error: null };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[camera.ts] getUserMedia failed!');
    // eslint-disable-next-line no-console
    console.error('[camera.ts] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    // eslint-disable-next-line no-console
    console.error('[camera.ts] Error name:', error instanceof DOMException ? error.name : 'N/A');
    // eslint-disable-next-line no-console
    console.error('[camera.ts] Error message:', error instanceof Error ? error.message : String(error));
    // eslint-disable-next-line no-console
    console.error('[camera.ts] Full error object:', error);

    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        console.error('[camera.ts] Permission denied error detected');
        return { stream: null, error: 'PERMISSION_DENIED' };
      }
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        console.error('[camera.ts] No camera found error detected');
        return { stream: null, error: 'NO_CAMERA' };
      }
      if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        console.error('[camera.ts] Camera is already in use:', error);
        return { stream: null, error: 'UNKNOWN_ERROR' };
      }
      if (error.name === 'OverconstrainedError') {
        // eslint-disable-next-line no-console
        console.warn('[camera.ts] Camera constraints not supported, trying fallback...');
        // Try with simpler constraints
        try {
          const fallbackConstraints = { video: { facingMode: 'user' } };
          // eslint-disable-next-line no-console
          console.log('[camera.ts] Trying fallback constraints:', JSON.stringify(fallbackConstraints, null, 2));
          const fallbackStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          // eslint-disable-next-line no-console
          console.log('[camera.ts] Fallback getUserMedia succeeded!');
          return { stream: fallbackStream, error: null };
        } catch (fallbackError) {
          // eslint-disable-next-line no-console
          console.error('[camera.ts] Fallback getUserMedia also failed:', fallbackError);
          return { stream: null, error: 'UNKNOWN_ERROR' };
        }
      }
    }

    // eslint-disable-next-line no-console
    console.error('[camera.ts] Unknown camera access error:', error);
    return { stream: null, error: 'UNKNOWN_ERROR' };
  }
}

/**
 * Stop camera stream and release resources
 */
export function stopCameraStream(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
}

/**
 * Calculate distance between two points
 */
function distance(p1: PoseKeypoint, p2: PoseKeypoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Validate user position in camera frame
 * @param keypoints Array of pose keypoints
 * @returns Position quality and setup state
 */
export function validatePosition(keypoints: PoseKeypoint[]): CameraSetupState {
  const leftShoulder = keypoints[PoseLandmark.LEFT_SHOULDER];
  const rightShoulder = keypoints[PoseLandmark.RIGHT_SHOULDER];

  // Check if keypoints are visible
  if (
    !leftShoulder ||
    !rightShoulder ||
    leftShoulder.score < LANDMARK_VISIBILITY_THRESHOLD ||
    rightShoulder.score < LANDMARK_VISIBILITY_THRESHOLD
  ) {
    return {
      status: 'POSITIONING',
      positionQuality: 'NOT_DETECTED',
      message: 'Position yourself in front of the camera',
      canProceed: false,
    };
  }

  // Calculate shoulder center (horizontal position)
  const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;

  // Calculate shoulder width
  const shoulderWidth = distance(leftShoulder, rightShoulder);

  // Check if user is centered
  const isCentered =
    shoulderCenterX >= SHOULDER_CENTER_MIN && shoulderCenterX <= SHOULDER_CENTER_MAX;

  // Check if distance is appropriate
  const isGoodDistance =
    shoulderWidth >= SHOULDER_WIDTH_MIN && shoulderWidth <= SHOULDER_WIDTH_MAX;

  if (isCentered && isGoodDistance) {
    return {
      status: 'READY',
      positionQuality: 'GOOD',
      message: 'Perfect! You\'re ready to start',
      canProceed: true,
    };
  }

  // Provide specific feedback
  let message = 'Adjust your position: ';
  if (!isCentered) {
    if (shoulderCenterX < SHOULDER_CENTER_MIN) {
      message += 'Move to the right';
    } else {
      message += 'Move to the left';
    }
  } else if (!isGoodDistance) {
    if (shoulderWidth < SHOULDER_WIDTH_MIN) {
      message += 'Move closer to the camera';
    } else {
      message += 'Move farther from the camera';
    }
  }

  return {
    status: 'POSITIONING',
    positionQuality: 'POOR',
    message,
    canProceed: false,
  };
}

/**
 * Get camera configuration based on device type
 */
export function getCameraConfig(deviceType: 'desktop' | 'mobile'): CameraConfig {
  if (deviceType === 'mobile') {
    return {
      width: MIN_CAMERA_WIDTH,
      height: MIN_CAMERA_HEIGHT,
      facingMode: 'user',
      frameRate: TARGET_FPS_MOBILE,
    };
  }

  return {
    width: IDEAL_CAMERA_WIDTH,
    height: IDEAL_CAMERA_HEIGHT,
    facingMode: 'user',
    frameRate: TARGET_FPS_DESKTOP,
  };
}

