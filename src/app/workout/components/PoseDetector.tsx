'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { validateForm } from '@/lib/pose/formValidation';
import { RepCounter } from '@/lib/utils/repCounter';
import { SessionManager } from '@/lib/utils/sessionManager';
import type { FormAnalysis } from '@/types/pose';
import type { RepCounterOutput } from '@/types/ui';

interface PoseDetectorProps {
  videoStream: MediaStream;
  onFormAnalysis: (analysis: FormAnalysis) => void;
  onRepCountUpdate: (output: RepCounterOutput) => void;
  onSessionUpdate: (session: ReturnType<SessionManager['getSession']>) => void;
  onEndSession: () => void;
}

export function PoseDetector({
  videoStream,
  onFormAnalysis,
  onRepCountUpdate,
  onSessionUpdate,
  onEndSession,
}: PoseDetectorProps): JSX.Element {
  const { isInitialized, detectPose, getKeypoints } = usePoseDetection();
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const repCounterRef = useRef<RepCounter>(new RepCounter());
  const sessionManagerRef = useRef<SessionManager>(new SessionManager());
  const [isRunning, setIsRunning] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    
    // eslint-disable-next-line no-console
    console.log('[PoseDetector] Video setup effect triggered', {
      hasVideoElement: !!videoElement,
      hasStream: !!videoStream,
      streamActive: videoStream?.active,
      streamTracks: videoStream?.getTracks().length,
    });

    if (!videoElement) {
      // eslint-disable-next-line no-console
      console.warn('[PoseDetector] videoRef.current is null - video element not mounted yet, will retry');
      // Don't return early - the effect will run again when video element is mounted
      return;
    }

    if (!videoStream) {
      // eslint-disable-next-line no-console
      console.warn('[PoseDetector] videoStream is null - waiting for stream');
      return;
    }

    // MDN/WebRTC pattern: Set srcObject directly, let autoPlay handle playback
    // Do NOT call load() or change src after setting srcObject
    try {
      // eslint-disable-next-line no-console
      console.log('[PoseDetector] Setting up video element with stream');
      
      // Clear any existing stream first
      if (videoElement.srcObject) {
        const oldStream = videoElement.srcObject as MediaStream;
        oldStream.getTracks().forEach((track) => track.stop());
        // eslint-disable-next-line no-console
        console.log('[PoseDetector] Cleared old stream');
      }

      // Set the new stream (autoPlay attribute will handle playback)
      videoElement.srcObject = videoStream;
      // eslint-disable-next-line no-console
      console.log('[PoseDetector] Stream assigned to video.srcObject', {
        streamId: videoStream.id,
        streamActive: videoStream.active,
        tracks: videoStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })),
      });

      // Explicitly call play() as per MDN guidance (autoPlay may not work in all browsers)
      // This is safe because we set srcObject first, then play()
      const playPromise = videoElement.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // eslint-disable-next-line no-console
            console.log('[PoseDetector] Video playback started successfully', {
              videoWidth: videoElement.videoWidth,
              videoHeight: videoElement.videoHeight,
              readyState: videoElement.readyState,
              paused: videoElement.paused,
              currentTime: videoElement.currentTime,
            });
            // Mark video as ready for pose detection
            setIsVideoReady(true);
          })
          .catch((err) => {
            // Log all play() errors for debugging
            // eslint-disable-next-line no-console
            console.error('[PoseDetector] Error playing video:', {
              name: err?.name,
              message: err?.message,
              error: err,
              videoElement: {
                readyState: videoElement.readyState,
                paused: videoElement.paused,
                srcObject: !!videoElement.srcObject,
              },
            });
            setIsVideoReady(false);
          });
      } else {
        // eslint-disable-next-line no-console
        console.warn('[PoseDetector] play() returned undefined');
        // Still mark as ready if play() returned undefined (some browsers)
        setIsVideoReady(true);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[PoseDetector] Error setting up video element:', err);
    }

    // Cleanup: stop stream when component unmounts or stream changes
    return () => {
      setIsVideoReady(false);
      if (videoElement && videoElement.srcObject) {
        // eslint-disable-next-line no-console
        console.log('[PoseDetector] Cleaning up video element');
        
        try {
          // Pause video first to prevent AbortError
          videoElement.pause();
          
          // Don't stop tracks here - they're managed by the parent component
          // Just clear the srcObject reference
          videoElement.srcObject = null;
        } catch (cleanupErr) {
          // eslint-disable-next-line no-console
          console.error('[PoseDetector] Error during cleanup:', cleanupErr);
        }
      }
    };
  }, [videoStream]);

  const processFrame = useCallback(async () => {
    // Check all prerequisites before processing
    if (!videoRef.current) {
      // eslint-disable-next-line no-console
      console.warn('[PoseDetector] processFrame: videoRef.current is null, skipping frame');
      return;
    }

    if (!isInitialized) {
      // eslint-disable-next-line no-console
      console.warn('[PoseDetector] processFrame: pose detector not initialized, skipping frame');
      return;
    }

    if (!isRunning) {
      return;
    }

    const video = videoRef.current;

    // Check if video has stream attached
    if (!video.srcObject) {
      // eslint-disable-next-line no-console
      console.warn('[PoseDetector] processFrame: video.srcObject is null, skipping frame');
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Check if video has enough data
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      // Video not ready yet, continue loop to wait
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      const timestamp = Date.now();
      const result = await detectPose(video, timestamp);

      if (result) {
        const keypoints = getKeypoints(result);
        if (keypoints.length > 0) {
          // Validate form
          const formAnalysis = validateForm(keypoints);
          onFormAnalysis(formAnalysis);

          // Update rep counter
          repCounterRef.current.processFrame(formAnalysis, timestamp);
          const repOutput = repCounterRef.current.getOutput();
          onRepCountUpdate(repOutput);

          // Update session manager
          const counts = repCounterRef.current.getCounts();
          sessionManagerRef.current.updateReps(
            counts.correctReps,
            counts.incorrectReps
          );

          // Track errors
          if (formAnalysis.errors.length > 0) {
            formAnalysis.errors.forEach((error) => {
              sessionManagerRef.current.addError(error);
            });
          }

          // Update session
          onSessionUpdate(sessionManagerRef.current.getSession());
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[PoseDetector] Error processing frame:', error);
    }

    // Continue processing frames
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [isInitialized, isRunning, detectPose, getKeypoints, onFormAnalysis, onRepCountUpdate, onSessionUpdate]);

  // Start pose detection loop only when all prerequisites are met
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[PoseDetector] Pose detection effect triggered', {
      isInitialized,
      isRunning,
      isVideoReady,
      hasVideoRef: !!videoRef.current,
      hasSrcObject: !!videoRef.current?.srcObject,
      videoReadyState: videoRef.current?.readyState,
    });

    // Don't start if pose detector isn't initialized
    if (!isInitialized) {
      // eslint-disable-next-line no-console
      console.log('[PoseDetector] Pose detector not initialized, waiting...');
      return;
    }

    // Don't start if workout isn't running
    if (!isRunning) {
      // eslint-disable-next-line no-console
      console.log('[PoseDetector] Workout not running, waiting...');
      return;
    }

    // Don't start if video isn't ready (not mounted or stream not attached/playing)
    if (!isVideoReady) {
      // eslint-disable-next-line no-console
      console.log('[PoseDetector] Video not ready yet, waiting...');
      return;
    }

    // Don't start if video element doesn't exist
    if (!videoRef.current) {
      // eslint-disable-next-line no-console
      console.warn('[PoseDetector] videoRef.current is null, cannot start pose detection');
      return;
    }

    // Don't start if video doesn't have stream attached
    if (!videoRef.current.srcObject) {
      // eslint-disable-next-line no-console
      console.warn('[PoseDetector] video.srcObject is null, cannot start pose detection');
      return;
    }

    // All prerequisites met, start the detection loop
    // eslint-disable-next-line no-console
    console.log('[PoseDetector] All prerequisites met, starting pose detection loop');
    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationFrameRef.current) {
        // eslint-disable-next-line no-console
        console.log('[PoseDetector] Stopping pose detection loop');
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isInitialized, isRunning, isVideoReady, processFrame]);

  const handleStart = (): void => {
    sessionManagerRef.current.startSession();
    repCounterRef.current.reset();
    setIsRunning(true);
  };

  const handleStop = (): void => {
    setIsRunning(false);
    sessionManagerRef.current.endSession();
    onEndSession();
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-600">Initializing pose detection...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-screen">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover scale-x-[-1] bg-black"
        aria-label="Workout video feed"
      />

      {!isRunning && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <button
            onClick={handleStart}
            className="bg-green-500 text-white px-8 py-4 rounded-lg text-xl font-bold hover:bg-green-600 transition-colors"
            aria-label="Start workout"
          >
            Start Workout
          </button>
        </div>)}

      {isRunning && (
        <button
          onClick={handleStop}
          className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg text-sm hover:bg-black/70 transition-colors"
          aria-label="End session"
        >
          End Session
        </button>
      )}
    </div>
  );
}

