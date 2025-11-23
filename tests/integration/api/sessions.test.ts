import { POST, GET } from '@/app/api/sessions/route';
import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/database/mongodb';

// Mock MongoDB connection
jest.mock('@/lib/database/mongodb', () => ({
  connectToDatabase: jest.fn(),
}));

// Mock Session model
const mockSession = {
  save: jest.fn(),
  toObject: jest.fn(),
};

jest.mock('@/lib/database/models/Session', () => ({
  Session: jest.fn(() => mockSession),
}));

describe('/api/sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should create a session with valid data', async () => {
      const sessionData = {
        totalReps: 10,
        correctReps: 8,
        incorrectReps: 2,
        duration: 120,
        errors: ['ELBOW_ANGLE', 'HAND_WIDTH'],
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
      };

      mockSession.save.mockResolvedValue({
        ...sessionData,
        _id: 'test-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockSession.toObject.mockReturnValue({
        ...sessionData,
        _id: 'test-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        body: JSON.stringify(sessionData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data.correctReps).toBe(8);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        correctReps: -1, // invalid
      };

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should handle database errors', async () => {
      mockSession.save.mockRejectedValue(new Error('Database error'));

      const sessionData = {
        totalReps: 10,
        correctReps: 8,
        incorrectReps: 2,
        duration: 120,
        errors: [],
        startedAt: new Date().toISOString(),
      };

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        body: JSON.stringify(sessionData),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('GET', () => {
    it('should retrieve a session by ID', async () => {
      const mockFindById = jest.fn().mockResolvedValue({
        _id: 'test-id',
        totalReps: 10,
        correctReps: 8,
        incorrectReps: 2,
        duration: 120,
        errors: [],
        startedAt: new Date(),
        endedAt: new Date(),
        toObject: () => ({
          id: 'test-id',
          totalReps: 10,
          correctReps: 8,
          incorrectReps: 2,
          duration: 120,
          errors: [],
          startedAt: new Date(),
          endedAt: new Date(),
        }),
      });

      const { Session } = await import('@/lib/database/models/Session');
      (Session as unknown as { findById: unknown }).findById = mockFindById;

      const request = new NextRequest('http://localhost:3000/api/sessions?id=test-id', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
    });

    it('should return 404 for non-existent session', async () => {
      const mockFindById = jest.fn().mockResolvedValue(null);

      const { Session } = await import('@/lib/database/models/Session');
      (Session as unknown as { findById: unknown }).findById = mockFindById;

      const request = new NextRequest('http://localhost:3000/api/sessions?id=non-existent', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(404);
    });
  });
});

