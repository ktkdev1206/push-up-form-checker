'use client';

import { useEffect, useRef, useState } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { Button } from '@/components/ui/Button';

interface CameraSetupProps {
  onReady: (stream: MediaStream) => void;
  onError: (error: string) => void;
}

export function CameraSetup({ onReady, onError }: CameraSetupProps): JSX.Element {
  const { stream, error, isLoading, setupState, startCamera } = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    // Check camera availability
    const checks: string[] = [];
    
    if (typeof navigator === 'undefined') {
      checks.push('❌ Navigator not available');
    } else {
      checks.push('✅ Navigator available');
    }

    if (navigator?.mediaDevices) {
      checks.push('✅ MediaDevices API available');
    } else {
      checks.push('❌ MediaDevices API not available');
    }

    // Check if getUserMedia is a function (properly check if it exists and is callable)
    const getUserMediaExists =
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices !== undefined &&
      typeof navigator.mediaDevices.getUserMedia === 'function';
    
    if (getUserMediaExists) {
      checks.push('✅ getUserMedia available');
    } else {
      checks.push('❌ getUserMedia not available');
    }

    if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
      checks.push('✅ Secure context (HTTPS/localhost)');
    } else {
      checks.push('❌ Not secure context - camera requires HTTPS');
    }

    setDebugInfo(checks.join('\n'));
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !stream) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log('[CameraSetup] Setting up video element with stream');

    // MDN/WebRTC pattern: Set srcObject directly, let autoPlay handle playback
    // Do NOT call load() or change src after setting srcObject
    try {
      // Clear any existing stream first
      if (videoElement.srcObject) {
        const oldStream = videoElement.srcObject as MediaStream;
        oldStream.getTracks().forEach((track) => track.stop());
      }

      // Set the new stream (autoPlay attribute will handle playback)
      videoElement.srcObject = stream;
      // eslint-disable-next-line no-console
      console.log('[CameraSetup] Stream assigned to video.srcObject');

      // Explicitly call play() as per MDN guidance (autoPlay may not work in all browsers)
      // This is safe because we set srcObject first, then play()
      const playPromise = videoElement.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // eslint-disable-next-line no-console
            console.log('[CameraSetup] Video playback started successfully');
          })
          .catch((err) => {
            // Log all play() errors for debugging
            // eslint-disable-next-line no-console
            console.error('[CameraSetup] Error playing video:', {
              name: err?.name,
              message: err?.message,
              error: err,
            });
          });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[CameraSetup] Error setting up video element:', err);
    }

    // Cleanup: stop stream when component unmounts or stream changes
    return () => {
      if (videoElement && videoElement.srcObject) {
        // eslint-disable-next-line no-console
        console.log('[CameraSetup] Cleaning up video element');
        
        try {
          // Pause video first to prevent AbortError
          videoElement.pause();
          
          // Stop all tracks in the stream
          const streamToStop = videoElement.srcObject as MediaStream;
          streamToStop.getTracks().forEach((track) => {
            track.stop();
            // eslint-disable-next-line no-console
            console.log('[CameraSetup] Stopped track:', track.kind, track.label);
          });
          
          // Clear srcObject (do NOT set to null before stopping tracks)
          videoElement.srcObject = null;
        } catch (cleanupErr) {
          // eslint-disable-next-line no-console
          console.error('[CameraSetup] Error during cleanup:', cleanupErr);
        }
      }
    };
  }, [stream]);

  useEffect(() => {
    if (error) {
      onError(error);
    }
  }, [error, onError]);

  useEffect(() => {
    if (setupState.status === 'READY' && stream) {
      onReady(stream);
    }
  }, [setupState.status, stream, onReady]);

  const handleStartCamera = (): void => {
    // eslint-disable-next-line no-console
    console.log('[CameraSetup] Start Camera button clicked');
    // eslint-disable-next-line no-console
    console.log('[CameraSetup] Calling startCamera() from useCamera hook');
    startCamera().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[CameraSetup] Error in startCamera:', err);
    });
  };

  if (error) {
    let errorMessage = 'Failed to access camera';
    let helpText = 'Please check your browser settings and try again.';

    if (error === 'PERMISSION_DENIED') {
      errorMessage = 'Camera permission denied';
      helpText =
        'Please allow camera access in your browser settings. Click the camera icon in the address bar and select "Allow".';
    } else if (error === 'NO_CAMERA') {
      errorMessage = 'No camera found';
      helpText = 'Please connect a camera to your device and try again.';
    } else if (error === 'UNKNOWN_ERROR') {
      errorMessage = 'Camera access error';
      helpText =
        'Make sure you\'re using HTTPS (required for camera access) and that no other app is using your camera.';
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-black flex flex-col items-center justify-center p-8 text-center">
        <p className="text-red-400 mb-4 text-xl">{errorMessage}</p>
        <p className="text-gray-300 mb-6 max-w-md">{helpText}</p>
        <div className="space-y-3">
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleStartCamera();
            }}
            variant="primary"
            className="bg-teal-400 hover:bg-teal-500"
          >
            Try Again
          </Button>
          <div>
            <Button
              onClick={() => window.location.reload()}
              variant="secondary"
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-black px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* White Card with Phone Preview */}
        <div className="bg-white rounded-3xl p-6 md:p-8 mb-6 shadow-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Camera Position Detector Setup!
          </h2>
          <p className="text-gray-600 mb-6 text-sm md:text-base">
            Position yourself sideways, tap full body, all you need to push-up position, ultra-up for best resolution, thin action.
          </p>

          {/* Video Preview Area */}
          <div className="relative bg-gray-100 rounded-2xl overflow-hidden aspect-video mb-4">
            {stream ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                  aria-label="Camera preview"
                />
                {/* Position Indicators */}
                <div className="absolute top-4 right-4 flex gap-2">
                  {setupState.positionQuality === 'GOOD' && (
                    <>
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                      </div>
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">📱</div>
                  <p className="text-gray-500">
                    {isLoading ? 'Loading camera...' : 'Camera not started'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tip Box */}
        <div className="bg-amber-900/50 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-amber-700/30">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <p className="text-amber-100 text-base md:text-lg">
              Tip: Camera should see your shoulders, elbows, and hips 👀
            </p>
          </div>
        </div>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && debugInfo && (
          <div className="mb-4 p-4 bg-gray-800 rounded-lg text-xs text-gray-300 font-mono whitespace-pre-line">
            <strong>Debug Info:</strong>
            <br />
            {debugInfo}
          </div>
        )}

        {/* Start Button */}
        <div className="flex justify-center">
          {!stream ? (
            <Button
              onClick={(e) => {
                // eslint-disable-next-line no-console
                console.log('[CameraSetup] Button onClick event fired', e);
                e.preventDefault();
                e.stopPropagation();
                handleStartCamera();
              }}
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="bg-teal-400 hover:bg-teal-500 text-white font-semibold rounded-xl py-4 px-8 text-lg shadow-lg w-full max-w-md disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Start camera"
            >
              {isLoading ? 'Starting Camera...' : 'Start Camera'}
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (setupState.canProceed && stream) {
                  onReady(stream);
                }
              }}
              variant="primary"
              size="lg"
              disabled={!setupState.canProceed}
              className="bg-teal-400 hover:bg-teal-500 text-white font-semibold rounded-xl py-4 px-8 text-lg shadow-lg w-full max-w-md disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Start workout"
            >
              Got it, let&apos;s go!
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

