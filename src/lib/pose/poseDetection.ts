import type { PoseKeypoint, PoseDetectionResult } from '@/types/pose';
import type { Pose } from '@/types/pose';

/**
 * Global timestamp manager for MediaPipe pose detection
 * Ensures timestamps are strictly increasing and never 0
 */
let lastTimestamp = 0;
let currentLandmarkerId: symbol | null = null;

/**
 * Reset timestamp counter (call when creating a new PoseLandmarker instance)
 */
export function resetPoseTimestamp(): void {
  lastTimestamp = 0;
  currentLandmarkerId = Symbol('landmarker');
  // eslint-disable-next-line no-console
  console.log('[detectPoseFrame] Timestamp counter reset for new landmarker');
}

/**
 * Get the current landmarker ID (used to detect when landmarker changes)
 */
export function getCurrentLandmarkerId(): symbol | null {
  return currentLandmarkerId;
}

/**
 * Single utility function for calling detectForVideo with strictly increasing timestamps
 * This is the ONLY place where detectForVideo should be called
 * 
 * @param landmarker MediaPipe PoseLandmarker instance
 * @param video HTMLVideoElement to detect poses in
 * @returns Object with landmarks and the timestamp that was used
 */
export function detectPoseFrame(
  landmarker: {
    detectForVideo: (
      video: HTMLVideoElement | ImageData,
      timestamp: number
    ) => { landmarks: unknown[] };
  },
  video: HTMLVideoElement
): { landmarks: unknown[]; timestamp: number } | null {
  try {
    // Ensure timestamp is strictly increasing and never 0
    const now = performance.now();
    const previousTimestamp = lastTimestamp;
    const timestamp = Math.max(now, lastTimestamp + 1);
    lastTimestamp = timestamp;

    // Debug logging
    // eslint-disable-next-line no-console
    console.debug('[detectPoseFrame] detect frame', {
      timestamp,
      lastTimestamp: previousTimestamp,
    });

    // Call detectForVideo - this is the ONLY place it should be called
    const result = landmarker.detectForVideo(video, timestamp);
    return { ...result, timestamp };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('timestamp mismatch') || errorMessage.includes('free_memory')) {
      // eslint-disable-next-line no-console
      console.error('[detectPoseFrame] Timestamp mismatch error:', {
        timestamp: lastTimestamp,
        error: errorMessage,
      });
      // Reset timestamp for next landmarker instance
      resetPoseTimestamp();
      throw new Error(`MediaPipe timestamp mismatch: ${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Pose detection wrapper for MediaPipe and MoveNet
 * Handles initialization, frame processing, and cleanup
 */
export class PoseDetector {
  private detector: unknown = null;
  private detectorType: 'mediapipe' | 'movenet' | null = null;
  private isInitialized = false;

  /**
   * Initialize pose detector (MediaPipe preferred, MoveNet fallback)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Try MediaPipe first
      await this.initializeMediaPipe();
      this.detectorType = 'mediapipe';
      this.isInitialized = true;
    } catch (error) {
      console.warn('MediaPipe initialization failed, trying MoveNet:', error);
      try {
        await this.initializeMoveNet();
        this.detectorType = 'movenet';
        this.isInitialized = true;
      } catch (fallbackError) {
        console.error('Both pose detectors failed to initialize:', fallbackError);
        throw new Error('Pose detection initialization failed');
      }
    }
  }

  /**
   * Initialize MediaPipe PoseLandmarker
   */
  private async initializeMediaPipe(): Promise<void> {
    // Dynamic import to reduce bundle size
    const { PoseLandmarker, FilesetResolver } = await import(
      '@mediapipe/tasks-vision'
    );

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    // Reset timestamp counter when creating a new landmarker instance
    resetPoseTimestamp();

    this.detector = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task`,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  /**
   * Initialize MoveNet pose detector
   */
  private async initializeMoveNet(): Promise<void> {
    // Dynamic import to reduce bundle size
    const poseDetection = await import('@tensorflow-models/pose-detection');
    const detectorConfig = {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
      enableSmoothing: true,
      minPoseScore: 0.5,
    };

    this.detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      detectorConfig
    );
  }

  /**
   * Detect poses in a video frame
   * @param videoElement HTML video element or ImageData
   * @param _timestamp Timestamp parameter (ignored for MediaPipe - managed internally)
   * @returns Pose detection result
   */
  async detectPoses(
    videoElement: HTMLVideoElement | ImageData,
    _timestamp: number
  ): Promise<PoseDetectionResult> {
    if (!this.isInitialized || !this.detector) {
      throw new Error('Pose detector not initialized');
    }

    if (this.detectorType === 'mediapipe') {
      return this.detectWithMediaPipe(videoElement, _timestamp);
    } else if (this.detectorType === 'movenet') {
      return this.detectWithMoveNet(videoElement, _timestamp);
    }

    throw new Error('Unknown detector type');
  }

  /**
   * Detect poses using MediaPipe
   * Uses detectPoseFrame utility to ensure strictly increasing timestamps
   */
  private async detectWithMediaPipe(
    videoElement: HTMLVideoElement | ImageData,
    _timestamp: number // Ignored - detectPoseFrame manages timestamps internally
  ): Promise<PoseDetectionResult> {
    // Only support HTMLVideoElement for MediaPipe (not ImageData)
    if (!(videoElement instanceof HTMLVideoElement)) {
      throw new Error('MediaPipe pose detection requires HTMLVideoElement');
    }

    // Use the centralized detectPoseFrame utility
    // This ensures timestamps are strictly increasing and never 0
    const result = detectPoseFrame(
      this.detector as {
        detectForVideo: (
          video: HTMLVideoElement | ImageData,
          timestamp: number
        ) => { landmarks: unknown[] };
      },
      videoElement
    );

    if (!result) {
      throw new Error('Pose detection returned null');
    }

    // Convert MediaPipe landmarks to our format
    const poses: Pose[] = result.landmarks.map((landmark: unknown) => {
      const mpLandmark = landmark as {
        x: number;
        y: number;
        z: number;
        visibility: number;
      }[];

      const keypoints: PoseKeypoint[] = mpLandmark.map((point, index) => ({
        x: point.x,
        y: point.y,
        z: point.z,
        score: point.visibility,
        name: `landmark_${index}`,
      }));

      return {
        keypoints,
        score: 1.0, // MediaPipe doesn't provide overall pose score
      };
    });

    return {
      poses,
      timestamp: result.timestamp, // Use the timestamp from detectPoseFrame
    };
  }

  /**
   * Detect poses using MoveNet
   */
  private async detectWithMoveNet(
    videoElement: HTMLVideoElement | ImageData,
    timestamp: number
  ): Promise<PoseDetectionResult> {
    const result = await (this.detector as {
      estimatePoses: (
        input: HTMLVideoElement | ImageData
      ) => Promise<unknown[]>;
    }).estimatePoses(videoElement);

    // Convert MoveNet keypoints to our format
    const poses: Pose[] = result.map((pose: unknown) => {
      const mnPose = pose as {
        keypoints: Array<{
          x: number;
          y: number;
          score: number;
          name: string;
        }>;
        score: number;
      };

      const keypoints: PoseKeypoint[] = mnPose.keypoints.map((kp) => ({
        x: kp.x,
        y: kp.y,
        score: kp.score,
        name: kp.name,
      }));

      return {
        keypoints,
        score: mnPose.score,
      };
    });

    return {
      poses,
      timestamp,
    };
  }

  /**
   * Cleanup and release resources
   */
  dispose(): void {
    if (this.detector && this.detectorType === 'movenet') {
      // MoveNet detectors may have dispose method
      if (typeof (this.detector as { dispose?: () => void }).dispose === 'function') {
        (this.detector as { dispose: () => void }).dispose();
      }
    }
    this.detector = null;
    this.detectorType = null;
    this.isInitialized = false;
  }

  /**
   * Check if detector is initialized
   */
  getInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get detector type
   */
  getDetectorType(): 'mediapipe' | 'movenet' | null {
    return this.detectorType;
  }
}
