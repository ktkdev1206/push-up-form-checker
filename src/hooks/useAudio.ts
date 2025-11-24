'use client';

import { useEffect, useRef } from 'react';

const AUDIO_MAP = {
  POSITIVE: '/audio/you-dont-know-me-son.mp3',
  NEGATIVE: '/audio/negative-warning.mp3',
  COUNTDOWN: '/audio/countdown-beep.mp3',
};

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNegRef = useRef(0);

  useEffect(() => {
    // Ensure this runs only in the browser
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
    }
  }, []);

  const playBeep = (src: string) => {
    if (audioRef.current) {
      // Rate-limiting for NEGATIVE audio
      if (src === AUDIO_MAP.NEGATIVE) {
        const now = Date.now();
        if (now - lastNegRef.current < 800) return;
        lastNegRef.current = now;
      }

      audioRef.current.src = src;
      audioRef.current.play().catch(() => {});
    }
  };

  const playTrigger = (type: 'POSITIVE' | 'NEGATIVE' | 'COUNTDOWN') => {
    const src = AUDIO_MAP[type];
    if (src) {
      playBeep(src);
    }
  };

  return { playBeep, playTrigger };
}
