import { AUDIO_DEBOUNCE_MS } from '@/lib/utils/constants';

/**
 * Audio player for success and failure feedback
 * Handles preloading, debouncing, and error handling
 */
export class AudioPlayer {
  private successAudio: HTMLAudioElement | null = null;
  private failureAudio: HTMLAudioElement | null = null;
  private lastPlayTime = 0;
  private isInitialized = false;
  private successPlayPromise: Promise<void> | null = null;
  private failurePlayPromise: Promise<void> | null = null;

  constructor() {
    // Audio paths will be set during initialization
  }

  /**
   * Initialize and preload audio files
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.successAudio = new Audio('/audio/you-dont-know-me-son.mp3');
      this.failureAudio = new Audio('/audio/gayyyy.mp3');

      // Preload audio (don't call load() - it can conflict with play())
      this.successAudio.preload = 'auto';
      this.failureAudio.preload = 'auto';

      // Wait for audio to be ready without calling load()
      await Promise.all([
        new Promise<void>((resolve) => {
          if (this.successAudio) {
            if (this.successAudio.readyState >= this.successAudio.HAVE_METADATA) {
              resolve();
            } else {
              this.successAudio.addEventListener('loadedmetadata', () => resolve(), { once: true });
            }
          } else {
            resolve();
          }
        }),
        new Promise<void>((resolve) => {
          if (this.failureAudio) {
            if (this.failureAudio.readyState >= this.failureAudio.HAVE_METADATA) {
              resolve();
            } else {
              this.failureAudio.addEventListener('loadedmetadata', () => resolve(), { once: true });
            }
          } else {
            resolve();
          }
        }),
      ]);

      this.isInitialized = true;
    } catch (error) {
      // Non-blocking: continue even if audio fails to load
      console.warn('Failed to initialize audio:', error);
    }
  }

  /**
   * Play success audio (debounced)
   */
  async playSuccess(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const now = Date.now();
    if (now - this.lastPlayTime < AUDIO_DEBOUNCE_MS) {
      return; // Debounce: ignore rapid calls
    }

    this.lastPlayTime = now;

    if (!this.successAudio) {
      return;
    }

    try {
      // Cancel any previous play() promise to prevent conflicts
      if (this.successPlayPromise) {
        try {
          // Pause current playback if any
          this.successAudio.pause();
          await this.successPlayPromise;
        } catch {
          // Ignore previous play() errors
        }
        this.successPlayPromise = null;
      }

      // Reset to start only if not already at start
      if (this.successAudio.currentTime > 0.1) {
        this.successAudio.currentTime = 0;
      }

      // Wait a tiny bit to ensure currentTime is set
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Play audio
      this.successPlayPromise = this.successAudio.play();
      await this.successPlayPromise;
      this.successPlayPromise = null;
    } catch (error) {
      // Only log non-AbortError errors (AbortError is expected during cleanup/rapid calls)
      if (error instanceof Error && error.name !== 'AbortError') {
        console.warn('Failed to play success audio:', error);
      }
      this.successPlayPromise = null;
    }
  }

  /**
   * Play failure audio (debounced)
   */
  async playFailure(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const now = Date.now();
    if (now - this.lastPlayTime < AUDIO_DEBOUNCE_MS) {
      return; // Debounce: ignore rapid calls
    }

    this.lastPlayTime = now;

    if (!this.failureAudio) {
      return;
    }

    try {
      // Cancel any previous play() promise to prevent conflicts
      if (this.failurePlayPromise) {
        try {
          // Pause current playback if any
          this.failureAudio.pause();
          await this.failurePlayPromise;
        } catch {
          // Ignore previous play() errors
        }
        this.failurePlayPromise = null;
      }

      // Reset to start only if not already at start
      if (this.failureAudio.currentTime > 0.1) {
        this.failureAudio.currentTime = 0;
      }

      // Wait a tiny bit to ensure currentTime is set
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Play audio
      this.failurePlayPromise = this.failureAudio.play();
      await this.failurePlayPromise;
      this.failurePlayPromise = null;
    } catch (error) {
      // Only log non-AbortError errors (AbortError is expected during cleanup/rapid calls)
      if (error instanceof Error && error.name !== 'AbortError') {
        console.warn('Failed to play failure audio:', error);
      }
      this.failurePlayPromise = null;
    }
  }

  /**
   * Set volume for both audio files (0-1)
   */
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (this.successAudio) {
      this.successAudio.volume = clampedVolume;
    }
    if (this.failureAudio) {
      this.failureAudio.volume = clampedVolume;
    }
  }

  /**
   * Cleanup: stop all audio playback
   */
  cleanup(): void {
    try {
      if (this.successAudio) {
        this.successAudio.pause();
        this.successAudio.src = '';
        this.successAudio = null;
      }
      if (this.failureAudio) {
        this.failureAudio.pause();
        this.failureAudio.src = '';
        this.failureAudio = null;
      }
      this.successPlayPromise = null;
      this.failurePlayPromise = null;
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Error during audio cleanup:', error);
    }
  }
}
