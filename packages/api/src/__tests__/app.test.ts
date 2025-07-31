import request from 'supertest';
import app from '../index';

describe('App', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        version: '1.0.0',
        environment: 'test',
      });
    });
  });

  describe('GET /api/status', () => {
    it('should return API status', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          service: 'StorySlip API',
          version: '1.0.0',
          status: 'operational',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
        },
      });
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route GET /unknown-route not found',
          timestamp: expect.any(String),
        },
      });
    });
  });
});