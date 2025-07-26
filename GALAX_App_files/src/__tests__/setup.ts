import { beforeAll, afterEach, afterAll } from 'vitest';
import '@testing-library/jest-dom';

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = ':memory:';
});

afterEach(() => {
  // Clean up after each test
});

afterAll(() => {
  // Final cleanup
});

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  // Uncomment to hide logs during tests
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};