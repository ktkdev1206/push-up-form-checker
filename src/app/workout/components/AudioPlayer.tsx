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
      // Map AudioTrigger to AUDIO_MAP keys
      let audioType: 'POSITIVE' | 'NEGATIVE' | 'COUNTDOWN';
      if (trigger === 'SUCCESS') {
        audioType = 'POSITIVE';
      } else if (trigger === 'FAILURE') {
        audioType = 'NEGATIVE';
      } else if (trigger === 'COUNTDOWN') {
        audioType = 'COUNTDOWN';
      } else {
        return; // NONE or unknown
      }
      
      playTrigger(audioType);
    }
  }, [trigger, playTrigger]);

  // This component doesn't render anything visible
  return <></>;
}

