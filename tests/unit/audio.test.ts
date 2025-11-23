import { AudioPlayer } from '@/lib/utils/audio';

// Mock HTMLAudioElement
class MockAudio {
  play = jest.fn().mockResolvedValue(undefined);
  pause = jest.fn();
  load = jest.fn();
  volume = 1;
  currentTime = 0;
  paused = true;
  ended = false;
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
}

global.Audio = MockAudio as unknown as typeof Audio;

describe('AudioPlayer', () => {
  let audioPlayer: AudioPlayer;

  beforeEach(() => {
    audioPlayer = new AudioPlayer();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with success and failure audio paths', () => {
      expect(audioPlayer).toBeDefined();
    });

    it('should preload audio files', async () => {
      await audioPlayer.initialize();
      // Audio should be loaded
      expect(MockAudio.prototype.load).toHaveBeenCalled();
    });
  });

  describe('playSuccess', () => {
    it('should play success audio', async () => {
      await audioPlayer.initialize();
      await audioPlayer.playSuccess();

      expect(MockAudio.prototype.play).toHaveBeenCalled();
    });

    it('should handle playback errors gracefully', async () => {
      MockAudio.prototype.play = jest.fn().mockRejectedValue(new Error('Playback failed'));

      await audioPlayer.initialize();
      await expect(audioPlayer.playSuccess()).resolves.not.toThrow();
    });
  });

  describe('playFailure', () => {
    it('should play failure audio', async () => {
      await audioPlayer.initialize();
      await audioPlayer.playFailure();

      expect(MockAudio.prototype.play).toHaveBeenCalled();
    });

    it('should handle playback errors gracefully', async () => {
      MockAudio.prototype.play = jest.fn().mockRejectedValue(new Error('Playback failed'));

      await audioPlayer.initialize();
      await expect(audioPlayer.playFailure()).resolves.not.toThrow();
    });
  });

  describe('debouncing', () => {
    it('should debounce rapid play calls', async () => {
      await audioPlayer.initialize();

      const startTime = Date.now();
      await audioPlayer.playSuccess();
      await audioPlayer.playSuccess(); // Should be debounced

      const callCount = (MockAudio.prototype.play as jest.Mock).mock.calls.length;
      expect(callCount).toBeLessThanOrEqual(1);
    });
  });
});

