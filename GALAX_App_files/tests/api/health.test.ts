import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { TestServer } from '../setup/test-server.js';
import request from 'supertest';

describe('API Health Endpoints', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    testServer = new TestServer();
    testServer.setupBasicMiddleware();
    
    // Setup health endpoint
    testServer.app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '0.2.0',
        environment: process.env.NODE_ENV || 'development'
      });
    });

    await testServer.start();
  });

  afterAll(async () => {
    await testServer.stop();
  });

  test('should return health status', async () => {
    const response = await request(testServer.app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      timestamp: expect.any(String),
      version: expect.any(String),
      environment: expect.any(String)
    });
  });

  test('should include valid timestamp', async () => {
    const response = await request(testServer.app)
      .get('/api/health')
      .expect(200);

    const timestamp = new Date(response.body.timestamp);
    expect(timestamp.getTime()).not.toBeNaN();
    expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
  });

  test('should return consistent response format', async () => {
    const response1 = await request(testServer.app).get('/api/health');
    const response2 = await request(testServer.app).get('/api/health');

    expect(Object.keys(response1.body)).toEqual(Object.keys(response2.body));
    expect(response1.body.status).toBe(response2.body.status);
    expect(response1.body.version).toBe(response2.body.version);
  });

  test('should handle malformed requests gracefully', async () => {
    await request(testServer.app)
      .get('/api/health?invalid=param')
      .expect(200);
  });

  test('should respond quickly', async () => {
    const start = Date.now();
    await request(testServer.app)
      .get('/api/health')
      .expect(200);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000); // Should respond within 1 second
  });
});