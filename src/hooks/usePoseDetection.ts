'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PoseDetector } from '@/lib/pose/poseDetection';
import type { PoseDetectionResult, PoseKeypoint } from '@/types/pose';

export function usePoseDetection() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detectorRef = useRef<PoseDetector | null>(null);
  const needsReinitRef = useRef(false); // Track if detector needs re-initialization

  // Initialize or re-initialize pose detector
  const initializeDetector = useCallback(async () => {
    // Dispose existing detector if any
    if (detectorRef.current) {
      detectorRef.current.dispose();
      detectorRef.current = null;
    }

    const detector = new PoseDetector();
    detectorRef.current = detector;
    needsReinitRef.current = false;

    try {
      await detector.initialize();
      setIsInitialized(true);
      setError(null);
      // eslint-disable-next-line no-console
      console.log('[usePoseDetection] Pose detector initialized successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize pose detector');
      setIsInitialized(false);
      // eslint-disable-next-line no-console
      console.error('[usePoseDetection] Failed to initialize pose detector:', err);
    }
  }, []);

  useEffect(() => {
    initializeDetector();

    return () => {
      if (detectorRef.current) {
        detectorRef.current.dispose();
        detectorRef.current = null;
      }
    };
  }, [initializeDetector]);

  // Re-initialize if needed (e.g., after timestamp mismatch)
  useEffect(() => {
    if (needsReinitRef.current && !isInitialized) {
      // eslint-disable-next-line no-console
      console.log('[usePoseDetection] Re-initializing pose detector after error');
      initializeDetector();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsReinitRef.current, isInitialized]); // Only depend on the values, not the ref object

  const detectPose = useCallback(
    async (videoElement: HTMLVideoElement | ImageData, timestamp: number) => {
      // Check if detector needs re-initialization due to timestamp mismatch
      if (needsReinitRef.current) {
        // eslint-disable-next-line no-console
        console.warn('[usePoseDetection] Detector needs re-initialization, skipping detection');
        return null;
      }

      if (!detectorRef.current || !isInitialized) {
        return null;
      }

      setIsDetecting(true);
      try {
        const result = await detectorRef.current.detectPoses(videoElement, timestamp);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        // Check if this is a timestamp mismatch error
        if (errorMessage.includes('timestamp mismatch') || errorMessage.includes('free_memory')) {
          // eslint-disable-next-line no-console
          console.error('[usePoseDetection] Timestamp mismatch error detected, marking for re-init:', errorMessage);
          needsReinitRef.current = true;
          setIsInitialized(false);
          setError('Pose detector needs re-initialization due to timestamp error');
          
          // Dispose current detector
          if (detectorRef.current) {
            detectorRef.current.dispose();
            detectorRef.current = null;
          }
          
          return null;
        }
        
        setError(errorMessage);
        return null;
      } finally {
        setIsDetecting(false);
      }
    },
    [isInitialized]
  );

  const getKeypoints = useCallback((result: PoseDetectionResult | null): PoseKeypoint[] => {
    if (!result || result.poses.length === 0) {
      return [];
    }

    // Return keypoints from the first (primary) pose
    return result.poses[0].keypoints;
  }, []);

  return {
    isInitialized,
    isDetecting,
    error,
    detectPose,
    getKeypoints,
    detectorType: detectorRef.current?.getDetectorType() ?? null,
  };
}

