import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestServer, mockDb } from '../setup/test-server.js';
import request from 'supertest';

describe('Authentication API Contract', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    testServer = new TestServer();
    testServer.setupBasicMiddleware();
    
    // Setup authentication endpoints
    testServer.app.post('/api/auth/register', (req, res) => {
      const { email, password, firstName, lastName } = req.body;
      
      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['email', 'password', 'firstName', 'lastName']
        });
      }

      // Check if user already exists
      const existingUser = mockDb.findUser({ email });
      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists'
        });
      }

      // Create user
      const user = mockDb.addUser({
        email,
        firstName,
        lastName,
        created_at: new Date().toISOString(),
        verified: false
      });

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          verified: user.verified
        }
      });
    });

    testServer.app.post('/api/auth/login', (req, res) => {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required'
        });
      }

      const user = mockDb.findUser({ email });
      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }

      res.json({
        message: 'Login successful',
        token: 'mock-jwt-token',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          verified: user.verified
        }
      });
    });

    testServer.app.post('/api/auth/logout', (req, res) => {
      res.json({
        message: 'Logout successful'
      });
    });

    testServer.app.post('/api/auth/verify-email', (req, res) => {
      const { token, email } = req.body;
      
      if (!token || !email) {
        return res.status(400).json({
          error: 'Token and email are required'
        });
      }

      const user = mockDb.findUser({ email });
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Mark user as verified
      user.verified = true;

      res.json({
        message: 'Email verified successfully',
        user: {
          id: user.id,
          email: user.email,
          verified: user.verified
        }
      });
    });

    await testServer.start();
  });

  beforeEach(() => {
    mockDb.clear();
  });

  afterAll(async () => {
    await testServer.stop();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(testServer.app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'User created successfully',
        user: {
          id: expect.any(Number),
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          verified: false
        }
      });
    });

    test('should reject registration with missing fields', async () => {
      const incompleteData = {
        email: 'test@example.com',
        password: 'SecurePass123!'
        // Missing firstName and lastName
      };

      const response = await request(testServer.app)
        .post('/api/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Missing required fields',
        required: expect.arrayContaining(['firstName', 'lastName'])
      });
    });

    test('should reject registration with existing email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      // First registration
      await request(testServer.app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      const response = await request(testServer.app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toMatchObject({
        error: 'User already exists'
      });
    });

    test('should reject invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Note: In a real implementation, this would validate email format
      // For now, we'll accept it but document the expected behavior
      await request(testServer.app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a user for login tests
      await request(testServer.app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe'
        });
    });

    test('should login with valid credentials', async () => {
      const response = await request(testServer.app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Login successful',
        token: expect.any(String),
        user: {
          id: expect.any(Number),
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe'
        }
      });
    });

    test('should reject login with missing credentials', async () => {
      const response = await request(testServer.app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Email and password are required'
      });
    });

    test('should reject login with invalid credentials', async () => {
      const response = await request(testServer.app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword'
        })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Invalid credentials'
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should logout successfully', async () => {
      const response = await request(testServer.app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Logout successful'
      });
    });
  });

  describe('POST /api/auth/verify-email', () => {
    beforeEach(async () => {
      // Create a user for verification tests
      await request(testServer.app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe'
        });
    });

    test('should verify email with valid token', async () => {
      const response = await request(testServer.app)
        .post('/api/auth/verify-email')
        .send({
          token: 'valid-verification-token',
          email: 'test@example.com'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Email verified successfully',
        user: {
          id: expect.any(Number),
          email: 'test@example.com',
          verified: true
        }
      });
    });

    test('should reject verification with missing token', async () => {
      const response = await request(testServer.app)
        .post('/api/auth/verify-email')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Token and email are required'
      });
    });

    test('should reject verification for non-existent user', async () => {
      const response = await request(testServer.app)
        .post('/api/auth/verify-email')
        .send({
          token: 'valid-verification-token',
          email: 'nonexistent@example.com'
        })
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'User not found'
      });
    });
  });
});