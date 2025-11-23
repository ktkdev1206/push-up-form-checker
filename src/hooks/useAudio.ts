'use client';

import { useCallback, useRef, useEffect } from 'react';
import { AudioPlayer } from '@/lib/utils/audio';
import type { AudioTrigger } from '@/types/audio';

export function useAudio() {
  const audioPlayerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    audioPlayerRef.current = new AudioPlayer();
    audioPlayerRef.current.initialize().catch((error) => {
      console.warn('Failed to initialize audio player:', error);
    });

    return () => {
      // Cleanup audio player on unmount
      if (audioPlayerRef.current) {
        audioPlayerRef.current.cleanup();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  const playTrigger = useCallback(async (trigger: AudioTrigger) => {
    if (!audioPlayerRef.current) {
      return;
    }

    if (trigger === 'SUCCESS') {
      await audioPlayerRef.current.playSuccess();
    } else if (trigger === 'FAILURE') {
      await audioPlayerRef.current.playFailure();
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.setVolume(volume);
    }
  }, []);

  return {
    playTrigger,
    setVolume,
  };
}

