import { calculateAngle, calculateElbowAngles } from '@/lib/pose/angleCalculation';
import type { PoseKeypoint } from '@/types/pose';

describe('angleCalculation', () => {
  describe('calculateAngle', () => {
    it('should calculate 90 degree angle correctly', () => {
      // Right angle triangle
      const point1: PoseKeypoint = { x: 0, y: 0, score: 1, name: 'point1' };
      const vertex: PoseKeypoint = { x: 0, y: 1, score: 1, name: 'vertex' };
      const point2: PoseKeypoint = { x: 1, y: 1, score: 1, name: 'point2' };

      const angle = calculateAngle(point1, vertex, point2);
      expect(angle).toBeCloseTo(90, 1);
    });

    it('should calculate 180 degree angle (straight line)', () => {
      const point1: PoseKeypoint = { x: 0, y: 0, score: 1, name: 'point1' };
      const vertex: PoseKeypoint = { x: 1, y: 0, score: 1, name: 'vertex' };
      const point2: PoseKeypoint = { x: 2, y: 0, score: 1, name: 'point2' };

      const angle = calculateAngle(point1, vertex, point2);
      expect(angle).toBeCloseTo(180, 1);
    });

    it('should calculate 0 degree angle (same points)', () => {
      const point1: PoseKeypoint = { x: 0, y: 0, score: 1, name: 'point1' };
      const vertex: PoseKeypoint = { x: 0, y: 0, score: 1, name: 'vertex' };
      const point2: PoseKeypoint = { x: 1, y: 0, score: 1, name: 'point2' };

      const angle = calculateAngle(point1, vertex, point2);
      expect(angle).toBe(0);
    });

    it('should handle normalized coordinates (0-1 range)', () => {
      const point1: PoseKeypoint = { x: 0.2, y: 0.3, score: 1, name: 'point1' };
      const vertex: PoseKeypoint = { x: 0.5, y: 0.5, score: 1, name: 'vertex' };
      const point2: PoseKeypoint = { x: 0.8, y: 0.3, score: 1, name: 'point2' };

      const angle = calculateAngle(point1, vertex, point2);
      expect(angle).toBeGreaterThan(0);
      expect(angle).toBeLessThanOrEqual(180);
    });
  });

  describe('calculateElbowAngles', () => {
    it('should calculate left and right elbow angles correctly', () => {
      const keypoints: PoseKeypoint[] = [
        { x: 0.3, y: 0.2, score: 1, name: 'left_shoulder' }, // index 11
        { x: 0.7, y: 0.2, score: 1, name: 'right_shoulder' }, // index 12
        { x: 0.2, y: 0.4, score: 1, name: 'left_elbow' }, // index 13
        { x: 0.8, y: 0.4, score: 1, name: 'right_elbow' }, // index 14
        { x: 0.1, y: 0.6, score: 1, name: 'left_wrist' }, // index 15
        { x: 0.9, y: 0.6, score: 1, name: 'right_wrist' }, // index 16
      ];

      // Set up keypoints at correct indices
      const fullKeypoints: PoseKeypoint[] = new Array(33).fill(null).map((_, i) => {
        const index = [11, 12, 13, 14, 15, 16].indexOf(i);
        return index !== -1 ? keypoints[index] : { x: 0, y: 0, score: 0, name: `point_${i}` };
      });

      const result = calculateElbowAngles(fullKeypoints);

      expect(result.left).toBeGreaterThan(0);
      expect(result.right).toBeGreaterThan(0);
      expect(result.average).toBeGreaterThan(0);
      expect(result.average).toBeCloseTo((result.left + result.right) / 2, 1);
    });

    it('should return 0 for angles when keypoints are missing', () => {
      const keypoints: PoseKeypoint[] = new Array(33).fill(null).map((_, i) => ({
        x: 0,
        y: 0,
        score: 0,
        name: `point_${i}`,
      }));

      const result = calculateElbowAngles(keypoints);

      expect(result.left).toBe(0);
      expect(result.right).toBe(0);
      expect(result.average).toBe(0);
    });

    it('should return 0 when visibility is below threshold', () => {
      const keypoints: PoseKeypoint[] = new Array(33).fill(null).map((_, i) => {
        if ([11, 12, 13, 14, 15, 16].includes(i)) {
          return { x: 0.5, y: 0.5, score: 0.3, name: `point_${i}` }; // low visibility
        }
        return { x: 0, y: 0, score: 0, name: `point_${i}` };
      });

      const result = calculateElbowAngles(keypoints);

      expect(result.left).toBe(0);
      expect(result.right).toBe(0);
      expect(result.average).toBe(0);
    });
  });
});

