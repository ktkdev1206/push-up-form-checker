'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import type { AudioTrigger } from '@/types/audio';

const AUDIO_FILES = {
  POSITIVE: '/audio/you-dont-know-me-son.mp3',
  NEGATIVE: '/audio/negative-warning.mp3',
  COUNTDOWN: '/audio/countdown-beep.mp3',
} as const;

const COOLDOWN_MS = 1000; // 1 second cooldown

export interface AudioPlayerRef {
  playCountdown: () => void;
  playPositive: () => void;
  playNegative: () => void;
}

interface AudioPlayerProps {
  trigger?: AudioTrigger;
}

/**
 * Audio player component that preloads all audio files and handles playback
 * with cooldowns and proper stop/replay logic for mobile compatibility
 */
export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  ({ trigger }, ref) => {
    // Preload all audio files in refs
    const positiveAudioRef = useRef<HTMLAudioElement | null>(null);
    const negativeAudioRef = useRef<HTMLAudioElement | null>(null);
    const countdownAudioRef = useRef<HTMLAudioElement | null>(null);
    
    // Track last play time for cooldown
    const lastPlayTimeRef = useRef<{
      positive: number;
      negative: number;
      countdown: number;
    }>({
      positive: 0,
      negative: 0,
      countdown: 0,
    });

    // Initialize and preload audio files (browser-only)
    useEffect(() => {
      if (typeof window === 'undefined') return;

      // Create audio elements and preload
      positiveAudioRef.current = new Audio(AUDIO_FILES.POSITIVE);
      negativeAudioRef.current = new Audio(AUDIO_FILES.NEGATIVE);
      countdownAudioRef.current = new Audio(AUDIO_FILES.COUNTDOWN);

      // Preload audio files
      [positiveAudioRef.current, negativeAudioRef.current, countdownAudioRef.current].forEach((audio) => {
        if (audio) {
          audio.preload = 'auto';
          // For mobile Safari, we need to set volume to ensure it's ready
          audio.volume = 1.0;
        }
      });

      // Cleanup on unmount
      return () => {
        [positiveAudioRef.current, negativeAudioRef.current, countdownAudioRef.current].forEach((audio) => {
          if (audio) {
            audio.pause();
            audio.src = '';
          }
        });
        positiveAudioRef.current = null;
        negativeAudioRef.current = null;
        countdownAudioRef.current = null;
      };
    }, []);

    // Helper function to play audio with cooldown and stop/replay logic
    const playAudio = (
      audioRef: React.MutableRefObject<HTMLAudioElement | null>,
      type: 'positive' | 'negative' | 'countdown'
    ): void => {
      if (typeof window === 'undefined') return;

      const audio = audioRef.current;
      if (!audio) return;

      // Check cooldown
      const now = Date.now();
      const timeSinceLastPlay = now - lastPlayTimeRef.current[type];
      if (timeSinceLastPlay < COOLDOWN_MS) {
        return; // Still in cooldown
      }

      // Stop and reset audio to avoid overlapping
      audio.pause();
      audio.currentTime = 0;

      // Update last play time
      lastPlayTimeRef.current[type] = now;

      // Play audio (with error handling for mobile)
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Silently handle play errors (common on mobile when user hasn't interacted)
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.warn(`Failed to play ${type} audio:`, error);
          }
        });
      }
    };

    // Exposed functions via ref (use useCallback to ensure stability)
    const playCountdown = useCallback(() => {
      playAudio(countdownAudioRef, 'countdown');
    }, []);

    const playPositive = useCallback(() => {
      playAudio(positiveAudioRef, 'positive');
    }, []);

    const playNegative = useCallback(() => {
      playAudio(negativeAudioRef, 'negative');
    }, []);

    // Expose functions via ref
    useImperativeHandle(ref, () => ({
      playCountdown,
      playPositive,
      playNegative,
    }), [playCountdown, playPositive, playNegative]);

    // Handle trigger prop (backward compatibility)
    useEffect(() => {
      if (trigger !== undefined && trigger !== 'NONE') {
        // Map AudioTrigger to functions
        if (trigger === 'SUCCESS') {
          playPositive();
        } else if (trigger === 'FAILURE') {
          playNegative();
        } else if (trigger === 'COUNTDOWN') {
          playCountdown();
        }
      }
    }, [trigger, playCountdown, playPositive, playNegative]);

    // This component doesn't render anything visible
    return null;
  }
);

AudioPlayer.displayName = 'AudioPlayer';
