import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestServer } from '../setup/test-server.js';
import { io as Client, Socket } from 'socket.io-client';

describe('Socket.IO Real-time Communication Tests', () => {
  let testServer: TestServer;
  let clientSocket: Socket;

  beforeAll(async () => {
    testServer = new TestServer();
    testServer.setupBasicMiddleware();
    
    // Setup Socket.IO event handlers
    testServer.io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);
      
      // Authentication event
      socket.on('authenticate', (data, callback) => {
        if (data && data.token) {
          socket.join('authenticated');
          socket.data.user = { id: 1, email: data.email || 'test@example.com' };
          callback({ success: true, user: socket.data.user });
        } else {
          callback({ success: false, error: 'Invalid token' });
        }
      });

      // Join room event
      socket.on('join-room', (data, callback) => {
        if (socket.data.user) {
          socket.join(data.room);
          socket.to(data.room).emit('user-joined', {
            user: socket.data.user,
            room: data.room
          });
          callback({ success: true, room: data.room });
        } else {
          callback({ success: false, error: 'Not authenticated' });
        }
      });

      // Leave room event
      socket.on('leave-room', (data, callback) => {
        socket.leave(data.room);
        socket.to(data.room).emit('user-left', {
          user: socket.data.user,
          room: data.room
        });
        callback({ success: true });
      });

      // Send message event
      socket.on('send-message', (data, callback) => {
        if (socket.data.user) {
          const message = {
            id: Date.now(),
            content: data.content,
            user: socket.data.user,
            timestamp: new Date().toISOString(),
            room: data.room
          };
          
          if (data.room) {
            socket.to(data.room).emit('message-received', message);
          } else {
            testServer.io.emit('message-received', message);
          }
          
          callback({ success: true, message });
        } else {
          callback({ success: false, error: 'Not authenticated' });
        }
      });

      // Help request events
      socket.on('create-help-request', (data, callback) => {
        if (socket.data.user) {
          const helpRequest = {
            id: Date.now(),
            title: data.title,
            description: data.description,
            category: data.category,
            urgency: data.urgency,
            user: socket.data.user,
            status: 'open',
            created_at: new Date().toISOString()
          };
          
          // Broadcast to all authenticated users
          testServer.io.to('authenticated').emit('help-request-created', helpRequest);
          callback({ success: true, helpRequest });
        } else {
          callback({ success: false, error: 'Not authenticated' });
        }
      });

      // Error handling
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      socket.on('disconnect', (reason) => {
        console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
      });
    });

    await testServer.start();
  });

  beforeEach(async () => {
    // Create fresh client for each test
    clientSocket = Client(testServer.baseUrl, {
      autoConnect: false,
      transports: ['websocket']
    });
  });

  afterAll(async () => {
    await testServer.stop();
  });

  describe('Connection Management', () => {
    test('should establish socket connection', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket.on('connect', () => {
          expect(clientSocket.connected).toBe(true);
          expect(clientSocket.id).toBeDefined();
          clientSocket.disconnect();
          resolve();
        });

        clientSocket.on('connect_error', reject);
        
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
        clientSocket.connect();
      });
    });

    test('should handle connection errors gracefully', async () => {
      const badClient = Client('http://localhost:9999', {
        autoConnect: false,
        transports: ['websocket'],
        timeout: 1000
      });

      return new Promise<void>((resolve) => {
        badClient.on('connect_error', (error) => {
          expect(error).toBeDefined();
          resolve();
        });

        badClient.connect();
      });
    });

    test('should disconnect properly', async () => {
      return new Promise<void>((resolve) => {
        clientSocket.on('connect', () => {
          clientSocket.disconnect();
        });

        clientSocket.on('disconnect', (reason) => {
          expect(reason).toBeDefined();
          expect(clientSocket.connected).toBe(false);
          resolve();
        });

        clientSocket.connect();
      });
    });
  });

  describe('Authentication', () => {
    test('should authenticate with valid token', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket.on('connect', () => {
          clientSocket.emit('authenticate', {
            token: 'valid-token',
            email: 'test@example.com'
          }, (response: any) => {
            try {
              expect(response.success).toBe(true);
              expect(response.user).toMatchObject({
                id: expect.any(Number),
                email: 'test@example.com'
              });
              clientSocket.disconnect();
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        });

        clientSocket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Test timeout')), 5000);
        clientSocket.connect();
      });
    });

    test('should reject authentication with invalid token', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket.on('connect', () => {
          clientSocket.emit('authenticate', {
            token: null
          }, (response: any) => {
            try {
              expect(response.success).toBe(false);
              expect(response.error).toBe('Invalid token');
              clientSocket.disconnect();
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        });

        clientSocket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Test timeout')), 5000);
        clientSocket.connect();
      });
    });
  });

  describe('Room Management', () => {
    test('should join and leave rooms', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket.on('connect', () => {
          // First authenticate
          clientSocket.emit('authenticate', {
            token: 'valid-token',
            email: 'test@example.com'
          }, (authResponse: any) => {
            if (!authResponse.success) {
              reject(new Error('Authentication failed'));
              return;
            }

            // Join room
            clientSocket.emit('join-room', {
              room: 'test-room'
            }, (joinResponse: any) => {
              try {
                expect(joinResponse.success).toBe(true);
                expect(joinResponse.room).toBe('test-room');

                // Leave room
                clientSocket.emit('leave-room', {
                  room: 'test-room'
                }, (leaveResponse: any) => {
                  try {
                    expect(leaveResponse.success).toBe(true);
                    clientSocket.disconnect();
                    resolve();
                  } catch (error) {
                    reject(error);
                  }
                });
              } catch (error) {
                reject(error);
              }
            });
          });
        });

        clientSocket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Test timeout')), 5000);
        clientSocket.connect();
      });
    });

    test('should reject room operations for unauthenticated users', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket.on('connect', () => {
          clientSocket.emit('join-room', {
            room: 'test-room'
          }, (response: any) => {
            try {
              expect(response.success).toBe(false);
              expect(response.error).toBe('Not authenticated');
              clientSocket.disconnect();
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        });

        clientSocket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Test timeout')), 5000);
        clientSocket.connect();
      });
    });
  });

  describe('Messaging', () => {
    test('should send and receive messages', async () => {
      const secondClient = Client(testServer.baseUrl, {
        autoConnect: false,
        transports: ['websocket']
      });

      return new Promise<void>((resolve, reject) => {
        let authenticated = 0;
        let messagesReceived = 0;

        const checkComplete = () => {
          if (messagesReceived >= 1) {
            clientSocket.disconnect();
            secondClient.disconnect();
            resolve();
          }
        };

        secondClient.on('connect', () => {
          secondClient.emit('authenticate', {
            token: 'valid-token',
            email: 'receiver@example.com'
          }, (response: any) => {
            if (response.success) {
              authenticated++;
              if (authenticated === 2) {
                // Both clients authenticated, send message
                clientSocket.emit('send-message', {
                  content: 'Test message',
                  room: null // Broadcast to all
                }, (sendResponse: any) => {
                  expect(sendResponse.success).toBe(true);
                });
              }
            }
          });
        });

        secondClient.on('message-received', (message: any) => {
          try {
            expect(message.content).toBe('Test message');
            expect(message.user.email).toBe('test@example.com');
            messagesReceived++;
            checkComplete();
          } catch (error) {
            reject(error);
          }
        });

        clientSocket.on('connect', () => {
          clientSocket.emit('authenticate', {
            token: 'valid-token',
            email: 'test@example.com'
          }, (response: any) => {
            if (response.success) {
              authenticated++;
              if (authenticated === 2) {
                // Both clients authenticated, send message
                clientSocket.emit('send-message', {
                  content: 'Test message',
                  room: null // Broadcast to all
                }, (sendResponse: any) => {
                  expect(sendResponse.success).toBe(true);
                });
              }
            }
          });
        });

        clientSocket.on('connect_error', reject);
        secondClient.on('connect_error', reject);
        
        setTimeout(() => reject(new Error('Test timeout')), 10000);
        
        clientSocket.connect();
        secondClient.connect();
      });
    });

    test('should reject messages from unauthenticated users', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket.on('connect', () => {
          clientSocket.emit('send-message', {
            content: 'Unauthorized message'
          }, (response: any) => {
            try {
              expect(response.success).toBe(false);
              expect(response.error).toBe('Not authenticated');
              clientSocket.disconnect();
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        });

        clientSocket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Test timeout')), 5000);
        clientSocket.connect();
      });
    });
  });

  describe('Help Request System', () => {
    test('should create and broadcast help requests', async () => {
      const secondClient = Client(testServer.baseUrl, {
        autoConnect: false,
        transports: ['websocket']
      });

      return new Promise<void>((resolve, reject) => {
        let authenticated = 0;
        let helpRequestReceived = false;

        const checkComplete = () => {
          if (helpRequestReceived) {
            clientSocket.disconnect();
            secondClient.disconnect();
            resolve();
          }
        };

        secondClient.on('connect', () => {
          secondClient.emit('authenticate', {
            token: 'valid-token',
            email: 'helper@example.com'
          }, (response: any) => {
            if (response.success) {
              authenticated++;
              if (authenticated === 2) {
                // Both clients authenticated, create help request
                clientSocket.emit('create-help-request', {
                  title: 'Need help with groceries',
                  description: 'Unable to get to the store',
                  category: 'errands',
                  urgency: 'medium'
                }, (createResponse: any) => {
                  expect(createResponse.success).toBe(true);
                  expect(createResponse.helpRequest).toMatchObject({
                    title: 'Need help with groceries',
                    category: 'errands',
                    urgency: 'medium'
                  });
                });
              }
            }
          });
        });

        secondClient.on('help-request-created', (helpRequest: any) => {
          try {
            expect(helpRequest.title).toBe('Need help with groceries');
            expect(helpRequest.user.email).toBe('test@example.com');
            expect(helpRequest.status).toBe('open');
            helpRequestReceived = true;
            checkComplete();
          } catch (error) {
            reject(error);
          }
        });

        clientSocket.on('connect', () => {
          clientSocket.emit('authenticate', {
            token: 'valid-token',
            email: 'test@example.com'
          }, (response: any) => {
            if (response.success) {
              authenticated++;
              if (authenticated === 2) {
                // Both clients authenticated, create help request
                clientSocket.emit('create-help-request', {
                  title: 'Need help with groceries',
                  description: 'Unable to get to the store',
                  category: 'errands',
                  urgency: 'medium'
                }, (createResponse: any) => {
                  expect(createResponse.success).toBe(true);
                });
              }
            }
          });
        });

        clientSocket.on('connect_error', reject);
        secondClient.on('connect_error', reject);
        
        setTimeout(() => reject(new Error('Test timeout')), 10000);
        
        clientSocket.connect();
        secondClient.connect();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed event data', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket.on('connect', () => {
          clientSocket.emit('authenticate', null, (response: any) => {
            // Should handle null data gracefully
            expect(response.success).toBe(false);
            clientSocket.disconnect();
            resolve();
          });
        });

        clientSocket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Test timeout')), 5000);
        clientSocket.connect();
      });
    });

    test('should handle network interruptions gracefully', async () => {
      return new Promise<void>((resolve) => {
        let connectionCount = 0;

        clientSocket.on('connect', () => {
          connectionCount++;
          if (connectionCount === 1) {
            // Force disconnect to simulate network issue
            clientSocket.disconnect();
            // Reconnect after short delay
            setTimeout(() => clientSocket.connect(), 100);
          } else {
            // Successfully reconnected
            expect(connectionCount).toBe(2);
            clientSocket.disconnect();
            resolve();
          }
        });

        clientSocket.connect();
      });
    });
  });
});