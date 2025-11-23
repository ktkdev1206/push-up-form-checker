'use client';

import { useEffect } from 'react';
import { useAudio } from '@/hooks/useAudio';
import type { AudioTrigger } from '@/types/audio';

interface AudioPlayerProps {
  trigger: AudioTrigger;
}

/**
 * Hidden audio player component that handles audio playback
 * based on triggers from rep counter
 */
export function AudioPlayer({ trigger }: AudioPlayerProps): JSX.Element {
  const { playTrigger } = useAudio();

  useEffect(() => {
    if (trigger !== 'NONE') {
      playTrigger(trigger).catch((error) => {
        // Non-blocking: audio failures are handled silently
        console.warn('Audio playback failed:', error);
      });
    }
  }, [trigger, playTrigger]);

  // This component doesn't render anything visible
  return <></>;
}

