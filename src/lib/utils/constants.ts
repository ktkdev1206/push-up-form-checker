/**
 * Application constants
 */

// Pose detection thresholds (MVP-friendly - more lenient)
export const ELBOW_ANGLE_DOWN_THRESHOLD = 110; // degrees - below this is "down" (was 100, now more lenient)
export const ELBOW_ANGLE_UP_THRESHOLD = 150; // degrees - above this is "up" (was 160, now more lenient)
export const HAND_WIDTH_TOLERANCE = 0.25; // ±25% of shoulder width (was 0.15, now more lenient)
export const BODY_ALIGNMENT_THRESHOLD = 25; // degrees from horizontal (was 15, now more lenient)
export const LANDMARK_VISIBILITY_THRESHOLD = 0.5; // minimum visibility score

// Position validation
export const SHOULDER_CENTER_MIN = 0.3; // normalized horizontal position
export const SHOULDER_CENTER_MAX = 0.7;
export const SHOULDER_WIDTH_MIN = 0.15; // normalized width
export const SHOULDER_WIDTH_MAX = 0.35;

// Rep counting (MVP-friendly - more responsive)
export const REP_DEBOUNCE_MS = 300; // prevent double-counting (was 500, now more responsive)
export const REPS_FOR_SUCCESS_AUDIO = 5; // play audio every N correct reps
export const AUDIO_DEBOUNCE_MS = 1000; // prevent audio spam

// Camera settings
export const IDEAL_CAMERA_WIDTH = 1280;
export const IDEAL_CAMERA_HEIGHT = 720;
export const MIN_CAMERA_WIDTH = 640;
export const MIN_CAMERA_HEIGHT = 480;
export const MIN_FPS = 15;

// Performance targets
export const TARGET_FPS_DESKTOP = 30;
export const TARGET_FPS_MOBILE = 15;
export const FEEDBACK_LATENCY_MS = 100;

// Bundle size target
export const MAX_BUNDLE_SIZE_KB = 500;

