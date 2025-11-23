import {
  requestCameraPermission,
  validatePosition,
  getCameraConfig,
} from '@/lib/utils/camera';
import type { PositionQuality } from '@/types/camera';
import type { PoseKeypoint } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn();
global.navigator = {
  ...global.navigator,
  mediaDevices: {
    getUserMedia: mockGetUserMedia,
  } as unknown as MediaDevices,
} as Navigator;

describe('camera utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestCameraPermission', () => {
    it('should request camera permission successfully', async () => {
      const mockStream = {
        getTracks: () => [{ stop: jest.fn() }],
      } as MediaStream;

      mockGetUserMedia.mockResolvedValue(mockStream);

      const result = await requestCameraPermission();

      expect(result.stream).toBe(mockStream);
      expect(result.error).toBeNull();
      expect(mockGetUserMedia).toHaveBeenCalled();
    });

    it('should handle permission denied error', async () => {
      mockGetUserMedia.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));

      const result = await requestCameraPermission();

      expect(result.stream).toBeNull();
      expect(result.error).toBe('PERMISSION_DENIED');
    });

    it('should handle no camera found error', async () => {
      mockGetUserMedia.mockRejectedValue(new DOMException('No camera', 'NotFoundError'));

      const result = await requestCameraPermission();

      expect(result.stream).toBeNull();
      expect(result.error).toBe('NO_CAMERA');
    });

    it('should handle other errors', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Unknown error'));

      const result = await requestCameraPermission();

      expect(result.stream).toBeNull();
      expect(result.error).toBe('UNKNOWN_ERROR');
    });
  });

  describe('validatePosition', () => {
    const createKeypoint = (x: number, y: number, score: number = 1): PoseKeypoint => ({
      x,
      y,
      score,
      name: 'test',
    });

    it('should return GOOD when position is valid', () => {
      const keypoints: PoseKeypoint[] = new Array(33).fill(null).map((_, i) => ({
        x: 0,
        y: 0,
        score: 0,
        name: `point_${i}`,
      }));

      // Center position, good visibility
      keypoints[PoseLandmark.LEFT_SHOULDER] = createKeypoint(0.4, 0.3);
      keypoints[PoseLandmark.RIGHT_SHOULDER] = createKeypoint(0.6, 0.3);

      const result = validatePosition(keypoints);

      expect(result.quality).toBe('GOOD');
      expect(result.canProceed).toBe(true);
    });

    it('should return POOR when user is off-center', () => {
      const keypoints: PoseKeypoint[] = new Array(33).fill(null).map((_, i) => ({
        x: 0,
        y: 0,
        score: 0,
        name: `point_${i}`,
      }));

      // Too far left
      keypoints[PoseLandmark.LEFT_SHOULDER] = createKeypoint(0.1, 0.3);
      keypoints[PoseLandmark.RIGHT_SHOULDER] = createKeypoint(0.3, 0.3);

      const result = validatePosition(keypoints);

      expect(result.quality).toBe('POOR');
      expect(result.canProceed).toBe(false);
    });

    it('should return NOT_DETECTED when keypoints are missing', () => {
      const keypoints: PoseKeypoint[] = new Array(33).fill(null).map((_, i) => ({
        x: 0,
        y: 0,
        score: 0.3, // below threshold
        name: `point_${i}`,
      }));

      const result = validatePosition(keypoints);

      expect(result.quality).toBe('NOT_DETECTED');
      expect(result.canProceed).toBe(false);
    });
  });

  describe('getCameraConfig', () => {
    it('should return ideal config for desktop', () => {
      const config = getCameraConfig('desktop');

      expect(config.width).toBe(1280);
      expect(config.height).toBe(720);
      expect(config.frameRate).toBe(30);
    });

    it('should return mobile config for mobile', () => {
      const config = getCameraConfig('mobile');

      expect(config.width).toBe(640);
      expect(config.height).toBe(480);
      expect(config.frameRate).toBe(15);
    });
  });
});

