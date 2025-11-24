'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { useAudio } from '@/hooks/useAudio';
import { validateForm } from '@/lib/pose/formValidation';
import { RepCounter } from '@/lib/utils/repCounter';
import { SessionManager } from '@/lib/utils/sessionManager';
import { RepCounter as RepCounterComponent } from './components/RepCounter';
import { FormValidator } from './components/FormValidator';
import { AudioPlayer } from './components/AudioPlayer';
import { requestCameraPermission, validatePosition } from '@/lib/utils/camera';
import { Button } from '@/components/ui/Button';
import type { FormAnalysis } from '@/types/pose';
import type { RepCounterOutput } from '@/types/ui';

type WorkoutStage = 'REQUESTING' | 'READY' | 'ERROR';

export default function WorkoutPage(): JSX.Element {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const repCounterRef = useRef<RepCounter>(new RepCounter());
  const sessionManagerRef = useRef<SessionManager>(new SessionManager());
  
  const [stage, setStage] = useState<WorkoutStage>('REQUESTING');
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isWorkoutRunning, setIsWorkoutRunning] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [formAnalysis, setFormAnalysis] = useState<FormAnalysis | null>(null);
  const [repOutput, setRepOutput] = useState<RepCounterOutput>({
    correctReps: 0,
    incorrectReps: 0,
    totalAttempts: 0,
    audioTrigger: 'NONE',
  });
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const { isInitialized, detectPose, getKeypoints } = usePoseDetection();
  const { playTrigger } = useAudio();

  // Request camera permission on mount
  useEffect(() => {
    const requestCamera = async (): Promise<void> => {
      // eslint-disable-next-line no-console
      console.log('[WorkoutPage] Requesting camera permission on mount');
      
      try {
        const result = await requestCameraPermission();
        
        if (result.error) {
          // eslint-disable-next-line no-console
          console.error('[WorkoutPage] Camera permission error:', result.error);
          setCameraError(result.error);
          setStage('ERROR');
          return;
        }

        if (result.stream) {
          // eslint-disable-next-line no-console
          console.log('[WorkoutPage] Camera permission granted, stream obtained');
          setVideoStream(result.stream);
          setStage('READY');
          // Don't start session yet - wait for user to click "Start Workout"
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[WorkoutPage] Exception requesting camera:', err);
        setCameraError('UNKNOWN_ERROR');
        setStage('ERROR');
      }
    };

    requestCamera();
  }, []);

  // Attach stream to video element
  useEffect(() => {
    const videoElement = videoRef.current;
    
    if (!videoElement || !videoStream) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log('[WorkoutPage] Attaching stream to video element', {
      hasVideoElement: !!videoElement,
      hasStream: !!videoStream,
    });

    try {
      // Clear any existing stream
      if (videoElement.srcObject) {
        const oldStream = videoElement.srcObject as MediaStream;
        oldStream.getTracks().forEach((track) => track.stop());
      }

      // Set stream and video properties
      videoElement.srcObject = videoStream;
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = true;

      // Call play() explicitly
      const playPromise = videoElement.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // eslint-disable-next-line no-console
            console.log('[WorkoutPage] Video playback started, camera ready', {
              videoWidth: videoElement.videoWidth,
              videoHeight: videoElement.videoHeight,
              readyState: videoElement.readyState,
            });
            setIsCameraReady(true);
          })
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.error('[WorkoutPage] Error playing video:', {
              name: err?.name,
              message: err?.message,
            });
            setIsCameraReady(false);
          });
      } else {
        setIsCameraReady(true);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[WorkoutPage] Error setting up video:', err);
      setIsCameraReady(false);
    }

    return () => {
      setIsCameraReady(false);
    };
  }, [videoStream]);

  const handleRetryCamera = useCallback(async () => {
    setStage('REQUESTING');
    setCameraError(null);
    setIsCameraReady(false);
    
    try {
      const result = await requestCameraPermission();
      
      if (result.error) {
        setCameraError(result.error);
        setStage('ERROR');
        return;
      }

      if (result.stream) {
        setVideoStream(result.stream);
        setStage('READY');
      }
    } catch {
      setCameraError('UNKNOWN_ERROR');
      setStage('ERROR');
    }
  }, []);

  // Pose detection frame processing
  const processFrame = useCallback(async () => {
    if (!isWorkoutRunning) {
      return;
    }

    if (!videoRef.current) {
      return;
    }

    const video = videoRef.current;
    const hasSrcObject = video.srcObject instanceof MediaStream;
    const isVideoReady = video.readyState >= 2; // HAVE_CURRENT_DATA

    if (!hasSrcObject || !isVideoReady) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    if (!isInitialized) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      // Timestamp is now managed internally by detectPoseFrame utility
      // We pass a dummy timestamp (it will be ignored)
      const result = await detectPose(video, 0);

      if (result) {
        const keypoints = getKeypoints(result);
        if (keypoints.length > 0) {
          // Validate form
          const formAnalysis = validateForm(keypoints);
          setFormAnalysis(formAnalysis);

          // Update rep counter (use result timestamp which is managed by detectPoseFrame)
          repCounterRef.current.processFrame(formAnalysis, result.timestamp);
          const repOutput = repCounterRef.current.getOutput();
          
          // Always update rep output to ensure UI reflects latest counts
          setRepOutput(repOutput);

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
        }
      }
    } catch (error) {
      // Check if this is a MediaPipe timestamp mismatch error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('timestamp mismatch') || errorMessage.includes('free_memory')) {
        // eslint-disable-next-line no-console
        console.error('[WorkoutPage] MediaPipe timestamp mismatch detected, stopping pose detection:', errorMessage);
        // Stop the loop - detectPoseFrame will reset timestamp, detector will be re-initialized by usePoseDetection
        setIsWorkoutRunning(false);
        return;
      }
      // eslint-disable-next-line no-console
      console.error('[WorkoutPage] Error processing frame:', error);
    }

    // Continue processing frames
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [isWorkoutRunning, isInitialized, detectPose, getKeypoints]);

  // Start/stop pose detection loop based on workout state
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[WorkoutPage] Pose detection effect', {
      hasVideoRef: !!videoRef.current,
      hasSrcObject: videoRef.current?.srcObject instanceof MediaStream,
      isInitialized,
      isRunning: isWorkoutRunning,
      isVideoReady: (videoRef.current?.readyState ?? 0) >= 2,
    });

    if (!isWorkoutRunning) {
      // Stop any running loop
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    if (!videoRef.current) {
      // eslint-disable-next-line no-console
      console.log('[WorkoutPage] videoRef.current is null, waiting...');
      return;
    }

    const video = videoRef.current;
    const hasSrcObject = video.srcObject instanceof MediaStream;
    const isVideoReady = video.readyState >= 2; // HAVE_CURRENT_DATA

    if (!hasSrcObject || !isVideoReady) {
      // eslint-disable-next-line no-console
      console.log('[WorkoutPage] Video not ready yet', { hasSrcObject, isVideoReady, readyState: video.readyState });
      return;
    }

    if (!isInitialized) {
      // eslint-disable-next-line no-console
      console.log('[WorkoutPage] Pose detector not initialized, waiting...');
      return;
    }

    // All prerequisites met, start detection loop
    // eslint-disable-next-line no-console
    console.log('[WorkoutPage] Starting pose detection loop');
    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isWorkoutRunning, isInitialized, processFrame]);

  // Show snackbar message
  const showSnackbar = useCallback((message: string) => {
    setSnackbarMessage(message);
    setTimeout(() => {
      setSnackbarMessage(null);
    }, 3000);
  }, []);

  // Validate position helper
  const validatePositionHelper = useCallback(async (): Promise<boolean> => {
    if (!videoRef.current || !isInitialized) {
      return false;
    }

    try {
      const result = await detectPose(videoRef.current, 0);
      if (result) {
        const keypoints = getKeypoints(result);
        if (keypoints.length > 0) {
          const positionState = validatePosition(keypoints);
          return positionState.canProceed;
        }
      }
      return false;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[WorkoutPage] Error validating position:', error);
      return false;
    }
  }, [isInitialized, detectPose, getKeypoints]);

  // Start session with countdown
  const onStart = useCallback(async () => {
    const ok = await validatePositionHelper();
    if (!ok) return showSnackbar('Move back so your full body is in frame');

    playTrigger('COUNTDOWN');
    await new Promise((r) => setTimeout(r, 3000));

    sessionManagerRef.current.startSession();
    setIsWorkoutRunning(true);
    setSessionActive(true);
    repCounterRef.current.reset();
  }, [validatePositionHelper, showSnackbar, playTrigger]);

  // Stop session
  const onStop = useCallback(() => {
    setIsWorkoutRunning(false);
    setSessionActive(false);
    
    // Stop camera tracks
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
    }

    // End session and navigate to summary with data
    sessionManagerRef.current.endSession();
    const finalSession = sessionManagerRef.current.getSession();
    
    router.push(`/summary?correct=${finalSession.correctReps}&incorrect=${finalSession.incorrectReps}&total=${finalSession.totalReps}&duration=${finalSession.duration}&errors=${encodeURIComponent(JSON.stringify(finalSession.errors))}`);
  }, [videoStream, router]);



  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop pose detection loop
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Stop camera tracks
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoStream]);

  // Handle camera error state
  if (stage === 'ERROR') {
    let errorMessage = 'Failed to access camera';
    let helpText = 'Please check your browser settings and try again.';

    if (cameraError === 'PERMISSION_DENIED') {
      errorMessage = 'Camera permission denied';
      helpText =
        'Please allow camera access in your browser settings. Click the camera icon in the address bar and select "Allow".';
    } else if (cameraError === 'NO_CAMERA') {
      errorMessage = 'No camera found';
      helpText = 'Please connect a camera to your device and try again.';
    } else if (cameraError === 'UNKNOWN_ERROR') {
      errorMessage = 'Camera access error';
      helpText =
        'Make sure you\'re using HTTPS (required for camera access) and that no other app is using your camera.';
    }

    return (
      <main className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-black flex flex-col items-center justify-center p-8 text-center">
        <p className="text-red-400 mb-4 text-xl">{errorMessage}</p>
        <p className="text-gray-300 mb-6 max-w-md">{helpText}</p>
        <div className="space-y-3">
          <Button
            onClick={handleRetryCamera}
            variant="primary"
            className="bg-teal-400 hover:bg-teal-500"
          >
            Try Again
          </Button>
          <div>
            <Button
              onClick={() => router.push('/')}
              variant="secondary"
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              Go Back
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Show loading state while requesting camera
  if (stage === 'REQUESTING') {
    return (
      <main className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-black flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">📷</div>
        <p className="text-white text-xl mb-2">Requesting camera permission...</p>
        <p className="text-gray-300 text-sm">Please allow camera access when prompted</p>
      </main>
    );
  }

  // Ready state - camera obtained, waiting for user to start workout
  if (stage === 'READY' && videoStream) {
    return (
      <main className="min-h-screen relative overflow-hidden bg-black">
        {/* Video element - fills entire screen */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1] bg-black"
          aria-label="Workout video feed"
        />

        {/* Start/Stop Session buttons */}
        {!sessionActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <div className="flex flex-col gap-4 items-center">
              <Button
                onClick={onStart}
                disabled={!isCameraReady}
                className="bg-green-500 text-white px-8 py-4 rounded-lg text-xl font-bold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Session
              </Button>
            </div>
          </div>
        )}

        {/* Stop Session button when active */}
        {sessionActive && (
          <div className="absolute top-4 right-4 z-20">
            <Button
              onClick={onStop}
              className="bg-red-500 text-white px-6 py-3 rounded-lg text-lg font-bold hover:bg-red-600 transition-colors"
            >
              Stop Session
            </Button>
          </div>
        )}

        {/* Snackbar notification */}
        {snackbarMessage && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg z-30 animate-slide-up max-w-md">
            <p className="font-medium text-center">{snackbarMessage}</p>
          </div>
        )}

        {/* Overlays - positioned on top of video with z-index */}
        {isWorkoutRunning && (
          <div className="absolute inset-0 z-10">
            <RepCounterComponent
              correctReps={repOutput.correctReps}
              incorrectReps={repOutput.incorrectReps}
              totalAttempts={repOutput.totalAttempts}
            />

            {formAnalysis && <FormValidator formAnalysis={formAnalysis} />}
          </div>
        )}

        {/* Audio Player */}
        <AudioPlayer trigger={repOutput.audioTrigger} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-gray-600">Loading workout session...</p>
      </div>
    </main>
  );
}

