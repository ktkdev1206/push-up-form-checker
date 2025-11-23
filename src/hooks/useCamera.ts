'use client';

import { useState, useEffect, useCallback } from 'react';
import { requestCameraPermission, stopCameraStream } from '@/lib/utils/camera';
import type { CameraSetupState } from '@/types/camera';
import { validatePosition } from '@/lib/utils/camera';
import type { PoseKeypoint } from '@/types/pose';

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [setupState, setSetupState] = useState<CameraSetupState>({
    status: 'INITIALIZING',
    positionQuality: 'NOT_DETECTED',
    message: 'Initializing camera...',
    canProceed: false,
  });

  const startCamera = useCallback(async () => {
    // eslint-disable-next-line no-console
    console.log('[useCamera] startCamera() called');
    // eslint-disable-next-line no-console
    console.log('[useCamera] Checking client-side environment...');
    
    // Verify we're on the client
    if (typeof window === 'undefined') {
      // eslint-disable-next-line no-console
      console.error('[useCamera] ERROR: startCamera called on server side!');
      setError('UNKNOWN_ERROR');
      setSetupState({
        status: 'PERMISSION_DENIED',
        positionQuality: 'NOT_DETECTED',
        message: 'Camera access requires client-side execution',
        canProceed: false,
      });
      return;
    }

    // eslint-disable-next-line no-console
    console.log('[useCamera] Client-side check passed');
    // eslint-disable-next-line no-console
    console.log('[useCamera] Navigator available:', typeof navigator !== 'undefined');
    // eslint-disable-next-line no-console
    console.log('[useCamera] MediaDevices available:', typeof navigator !== 'undefined' && navigator.mediaDevices !== undefined);
    // eslint-disable-next-line no-console
    console.log('[useCamera] getUserMedia available:', typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
    // eslint-disable-next-line no-console
    console.log('[useCamera] Secure context:', window.location.protocol === 'https:' || window.location.hostname === 'localhost');

    setIsLoading(true);
    setError(null);
    setSetupState({
      status: 'INITIALIZING',
      positionQuality: 'NOT_DETECTED',
      message: 'Requesting camera permission...',
      canProceed: false,
    });

    try {
      // eslint-disable-next-line no-console
      console.log('[useCamera] Calling requestCameraPermission()...');
      const result = await requestCameraPermission();
      // eslint-disable-next-line no-console
      console.log('[useCamera] requestCameraPermission() result:', {
        hasStream: !!result.stream,
        error: result.error,
      });

      if (result.error) {
        // eslint-disable-next-line no-console
        console.error('[useCamera] Camera permission error:', result.error);
        setError(result.error);
        setSetupState({
          status: 'PERMISSION_DENIED',
          positionQuality: 'NOT_DETECTED',
          message:
            result.error === 'PERMISSION_DENIED'
              ? 'Camera permission denied. Please enable camera access.'
              : result.error === 'NO_CAMERA'
                ? 'No camera found. Please connect a camera.'
                : 'Failed to access camera.',
          canProceed: false,
        });
        return;
      }

      if (result.stream) {
        // eslint-disable-next-line no-console
        console.log('[useCamera] Camera stream obtained successfully');
        // eslint-disable-next-line no-console
        console.log('[useCamera] Stream tracks:', result.stream.getTracks().map(t => ({ kind: t.kind, label: t.label, enabled: t.enabled, readyState: t.readyState })));
        setStream(result.stream);
        setSetupState({
          status: 'POSITIONING',
          positionQuality: 'NOT_DETECTED',
          message: 'Position yourself in front of the camera',
          canProceed: false,
        });
      } else {
        // eslint-disable-next-line no-console
        console.error('[useCamera] No stream returned but no error set');
        setError('UNKNOWN_ERROR');
        setSetupState({
          status: 'PERMISSION_DENIED',
          positionQuality: 'NOT_DETECTED',
          message: 'Failed to access camera. No stream returned.',
          canProceed: false,
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[useCamera] Exception in startCamera:', err);
      // eslint-disable-next-line no-console
      console.error('[useCamera] Error name:', err instanceof Error ? err.name : 'Unknown');
      // eslint-disable-next-line no-console
      console.error('[useCamera] Error message:', err instanceof Error ? err.message : String(err));
      // eslint-disable-next-line no-console
      console.error('[useCamera] Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      setError('UNKNOWN_ERROR');
      setSetupState({
        status: 'PERMISSION_DENIED',
        positionQuality: 'NOT_DETECTED',
        message: err instanceof Error ? `Failed to access camera: ${err.message}` : 'Failed to access camera',
        canProceed: false,
      });
    } finally {
      setIsLoading(false);
      // eslint-disable-next-line no-console
      console.log('[useCamera] startCamera() completed, isLoading set to false');
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopCameraStream(stream);
    setStream(null);
    setSetupState({
      status: 'INITIALIZING',
      positionQuality: 'NOT_DETECTED',
      message: 'Camera stopped',
      canProceed: false,
    });
  }, [stream]);

  const updatePosition = useCallback(
    (keypoints: PoseKeypoint[]) => {
      if (!stream) {
        return;
      }

      const positionState = validatePosition(keypoints);
      setSetupState(positionState);
    },
    [stream]
  );

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    stream,
    error,
    isLoading,
    setupState,
    startCamera,
    stopCamera,
    updatePosition,
  };
}

