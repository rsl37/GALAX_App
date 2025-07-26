/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { Server, Socket } from 'socket.io';
import { db } from './database.js';

interface UserConnection {
  userId: number;
  socketId: string;
  connectedAt: Date;
  lastActivity: Date;
  heartbeatInterval?: NodeJS.Timeout;
  idleTimeout?: NodeJS.Timeout;
}

interface ConnectionRetry {
  attempts: number;
  lastAttempt: Date;
  maxRetries: number;
}

class SocketManager {
  private connectedUsers = new Map<string, UserConnection>();
  private connectionRetries = new Map<string, ConnectionRetry>();
  private cleanupInterval: NodeJS.Timeout;
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.setupConnectionHandling();
    this.startCleanupProcess();
  }

  private setupConnectionHandling() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);
      this.handleNewConnection(socket);
    });
  }

  private handleNewConnection(socket: Socket) {
    // Initialize connection tracking
    this.connectedUsers.set(socket.id, {
      userId: 0, // Will be set during authentication
      socketId: socket.id,
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    // Set up heartbeat mechanism
    this.setupHeartbeat(socket);

    // Set up idle timeout
    this.setupIdleTimeout(socket);

    // Track activity
    this.setupActivityTracking(socket);

    // Handle authentication
    this.handleAuthentication(socket);

    // Handle room management
    this.handleRoomManagement(socket);

    // Handle messaging
    this.handleMessaging(socket);

    // Handle connection retry
    this.handleConnectionRetry(socket);

    // Handle disconnect
    this.handleDisconnect(socket);

    // Handle errors
    this.handleErrors(socket);
  }

  private setupHeartbeat(socket: Socket) {
    const heartbeat = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping', { timestamp: Date.now() });
      } else {
        clearInterval(heartbeat);
      }
    }, 30000); // 30 seconds

    const connection = this.connectedUsers.get(socket.id);
    if (connection) {
      connection.heartbeatInterval = heartbeat;
    }

    // Handle pong response
    socket.on('pong', (data) => {
      this.updateLastActivity(socket.id);
      console.log(`💓 Heartbeat response from ${socket.id}, latency: ${Date.now() - data.timestamp}ms`);
    });
  }

  private setupIdleTimeout(socket: Socket) {
    const idleTimeout = setTimeout(() => {
      this.checkIdleConnection(socket);
    }, 30 * 60 * 1000); // 30 minutes

    const connection = this.connectedUsers.get(socket.id);
    if (connection) {
      connection.idleTimeout = idleTimeout;
    }
  }

  private setupActivityTracking(socket: Socket) {
    // Track activity on any event
    socket.use((packet, next) => {
      this.updateLastActivity(socket.id);
      next();
    });
  }

  private handleAuthentication(socket: Socket) {
    socket.on('authenticate', async (token) => {
      try {
        console.log(`🔐 Authenticating socket: ${socket.id}`);
        
        if (!token || typeof token !== 'string') {
          socket.emit('auth_error', { message: 'Invalid token format' });
          return;
        }

        const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const userId = decoded.userId;

        if (!userId || typeof userId !== 'number') {
          socket.emit('auth_error', { message: 'Invalid user ID in token' });
          return;
        }

        // Check if user exists
        const user = await db
          .selectFrom('users')
          .select(['id', 'username'])
          .where('id', '=', userId)
          .executeTakeFirst();

        if (!user) {
          socket.emit('auth_error', { message: 'User not found' });
          return;
        }

        // Update connection with user ID
        const connection = this.connectedUsers.get(socket.id);
        if (connection) {
          connection.userId = userId;
        }

        // Store user connection in database
        await db
          .insertInto('user_connections')
          .values({
            user_id: userId,
            socket_id: socket.id
          })
          .execute();

        // Add to user room
        socket.join(`user_${userId}`);
        
        // Reset retry attempts on successful authentication
        this.connectionRetries.delete(socket.id);
        
        socket.emit('authenticated', { userId, timestamp: Date.now() });
        console.log(`✅ User ${userId} authenticated successfully`);
        
      } catch (error) {
        console.error(`❌ Authentication error for ${socket.id}:`, error);
        socket.emit('auth_error', { message: 'Authentication failed' });
      }
    });
  }

  private handleRoomManagement(socket: Socket) {
    socket.on('join_help_request', (helpRequestId) => {
      try {
        if (!this.isAuthenticated(socket.id)) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        if (!helpRequestId || typeof helpRequestId !== 'number' || helpRequestId <= 0) {
          socket.emit('error', { message: 'Invalid help request ID' });
          return;
        }
        
        socket.join(`help_request_${helpRequestId}`);
        console.log(`🏠 Socket ${socket.id} joined help request ${helpRequestId}`);
        
        socket.emit('room_joined', { roomId: `help_request_${helpRequestId}` });
        
      } catch (error) {
        console.error(`❌ Error joining room for ${socket.id}:`, error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('leave_help_request', (helpRequestId) => {
      try {
        if (!helpRequestId || typeof helpRequestId !== 'number') {
          return;
        }
        
        socket.leave(`help_request_${helpRequestId}`);
        console.log(`🚪 Socket ${socket.id} left help request ${helpRequestId}`);
        
        socket.emit('room_left', { roomId: `help_request_${helpRequestId}` });
        
      } catch (error) {
        console.error(`❌ Error leaving room for ${socket.id}:`, error);
      }
    });
  }

  private handleMessaging(socket: Socket) {
    socket.on('send_message', async (data) => {
      try {
        const connection = this.connectedUsers.get(socket.id);
        if (!connection || !connection.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const { helpRequestId, message } = data;
        
        // Validate input
        if (!helpRequestId || typeof helpRequestId !== 'number') {
          socket.emit('error', { message: 'Invalid help request ID' });
          return;
        }
        
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
          socket.emit('error', { message: 'Message cannot be empty' });
          return;
        }
        
        if (message.length > 1000) {
          socket.emit('error', { message: 'Message too long (max 1000 characters)' });
          return;
        }
        
        console.log(`💬 Message from user ${connection.userId} in help request ${helpRequestId}`);
        
        // Save message to database
        const savedMessage = await db
          .insertInto('messages')
          .values({
            help_request_id: helpRequestId,
            sender_id: connection.userId,
            message: message.trim()
          })
          .returning(['id', 'created_at'])
          .executeTakeFirst();

        if (!savedMessage) {
          socket.emit('error', { message: 'Failed to save message' });
          return;
        }

        // Get sender info
        const sender = await db
          .selectFrom('users')
          .select(['username', 'avatar_url'])
          .where('id', '=', connection.userId)
          .executeTakeFirst();

        // Broadcast to help request room
        const messageData = {
          id: savedMessage.id,
          message: message.trim(),
          sender: sender?.username || 'Unknown',
          avatar: sender?.avatar_url,
          timestamp: savedMessage.created_at
        };

        this.io.to(`help_request_${helpRequestId}`).emit('new_message', messageData);
        
        // Confirm message sent to sender
        socket.emit('message_sent', { 
          messageId: savedMessage.id, 
          timestamp: savedMessage.created_at 
        });

        console.log(`✅ Message ${savedMessage.id} sent successfully`);
        
      } catch (error) {
        console.error(`❌ Message send error for ${socket.id}:`, error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
  }

  private handleConnectionRetry(socket: Socket) {
    socket.on('retry_connection', () => {
      try {
        const retryInfo = this.connectionRetries.get(socket.id) || {
          attempts: 0,
          lastAttempt: new Date(),
          maxRetries: 5
        };

        if (retryInfo.attempts >= retryInfo.maxRetries) {
          socket.emit('max_retries_reached', { 
            message: 'Maximum retry attempts reached' 
          });
          this.forceDisconnect(socket, 'max_retries_exceeded');
          return;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delay = Math.min(1000 * Math.pow(2, retryInfo.attempts), 16000);
        
        retryInfo.attempts++;
        retryInfo.lastAttempt = new Date();
        this.connectionRetries.set(socket.id, retryInfo);

        setTimeout(() => {
          if (socket.connected) {
            socket.emit('connection_retry', { 
              attempt: retryInfo.attempts, 
              maxRetries: retryInfo.maxRetries,
              nextDelay: Math.min(1000 * Math.pow(2, retryInfo.attempts), 16000)
            });
          }
        }, delay);

        console.log(`🔄 Connection retry ${retryInfo.attempts}/${retryInfo.maxRetries} for ${socket.id}, delay: ${delay}ms`);
        
      } catch (error) {
        console.error(`❌ Connection retry error for ${socket.id}:`, error);
      }
    });
  }

  private handleDisconnect(socket: Socket) {
    socket.on('disconnect', async (reason) => {
      console.log(`🔌 Socket ${socket.id} disconnected: ${reason}`);
      await this.cleanupConnection(socket.id);
    });

    socket.on('disconnecting', (reason) => {
      console.log(`🔌 Socket ${socket.id} disconnecting: ${reason}`);
      // Log which rooms the socket was in
      socket.rooms.forEach(room => {
        if (room !== socket.id) {
          console.log(`📤 Socket ${socket.id} leaving room: ${room}`);
        }
      });
    });
  }

  private handleErrors(socket: Socket) {
    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
      socket.emit('error_handled', { message: 'An error occurred', timestamp: Date.now() });
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
      console.error(`❌ Connection error for ${socket.id}:`, error);
    });
  }

  private async cleanupConnection(socketId: string) {
    try {
      const connection = this.connectedUsers.get(socketId);
      
      if (connection) {
        // Clear intervals and timeouts
        if (connection.heartbeatInterval) {
          clearInterval(connection.heartbeatInterval);
        }
        
        if (connection.idleTimeout) {
          clearTimeout(connection.idleTimeout);
        }

        // Remove from database
        if (connection.userId) {
          await db
            .deleteFrom('user_connections')
            .where('socket_id', '=', socketId)
            .execute();
        }

        // Remove from memory
        this.connectedUsers.delete(socketId);
        
        console.log(`🧹 Cleaned up connection for socket ${socketId}`);
      }

      // Clean up retry attempts
      this.connectionRetries.delete(socketId);
      
    } catch (error) {
      console.error(`❌ Error cleaning up connection ${socketId}:`, error);
    }
  }

  private updateLastActivity(socketId: string) {
    const connection = this.connectedUsers.get(socketId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  private checkIdleConnection(socket: Socket) {
    const connection = this.connectedUsers.get(socket.id);
    if (!connection) return;

    const idleTime = Date.now() - connection.lastActivity.getTime();
    const maxIdleTime = 30 * 60 * 1000; // 30 minutes

    if (idleTime > maxIdleTime) {
      console.log(`⏰ Socket ${socket.id} idle for ${Math.round(idleTime / 60000)} minutes, disconnecting`);
      socket.emit('idle_timeout', { 
        message: 'Connection closed due to inactivity',
        idleTime: Math.round(idleTime / 60000)
      });
      this.forceDisconnect(socket, 'idle_timeout');
    } else {
      // Reset idle timeout
      this.setupIdleTimeout(socket);
    }
  }

  private forceDisconnect(socket: Socket, reason: string) {
    console.log(`🔌 Force disconnecting ${socket.id}: ${reason}`);
    socket.disconnect(true);
  }

  private isAuthenticated(socketId: string): boolean {
    const connection = this.connectedUsers.get(socketId);
    return connection ? connection.userId > 0 : false;
  }

  private startCleanupProcess() {
    // Periodic cleanup every 15 minutes
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 15 * 60 * 1000);

    console.log('🧹 Socket cleanup process started');
  }

  private async performCleanup() {
    console.log('🧹 Performing socket cleanup...');
    
    const now = Date.now();
    const maxIdleTime = 60 * 60 * 1000; // 1 hour for cleanup
    let cleanedCount = 0;

    // Clean up stale connections
    for (const [socketId, connection] of this.connectedUsers.entries()) {
      const idleTime = now - connection.lastActivity.getTime();
      
      if (idleTime > maxIdleTime) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          console.log(`🧹 Cleaning up stale connection: ${socketId}`);
          this.forceDisconnect(socket, 'stale_connection');
        } else {
          // Socket already gone, just clean up our tracking
          await this.cleanupConnection(socketId);
        }
        cleanedCount++;
      }
    }

    // Clean up old retry attempts
    const maxRetryAge = 5 * 60 * 1000; // 5 minutes
    for (const [socketId, retryInfo] of this.connectionRetries.entries()) {
      const retryAge = now - retryInfo.lastAttempt.getTime();
      if (retryAge > maxRetryAge) {
        this.connectionRetries.delete(socketId);
      }
    }

    // Clean up orphaned database connections
    try {
      const orphanedConnections = await db
        .selectFrom('user_connections')
        .selectAll()
        .execute();

      let orphanedCount = 0;
      for (const dbConnection of orphanedConnections) {
        const socket = this.io.sockets.sockets.get(dbConnection.socket_id);
        if (!socket) {
          await db
            .deleteFrom('user_connections')
            .where('socket_id', '=', dbConnection.socket_id)
            .execute();
          orphanedCount++;
        }
      }

      if (orphanedCount > 0) {
        console.log(`🧹 Cleaned up ${orphanedCount} orphaned database connections`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up orphaned connections:', error);
    }

    console.log(`🧹 Cleanup complete. Active connections: ${this.connectedUsers.size}, cleaned: ${cleanedCount}`);
  }

  // Public methods for monitoring
  public getConnectionCount(): number {
    return this.connectedUsers.size;
  }

  public getConnectedUsers(): Map<string, UserConnection> {
    return new Map(this.connectedUsers);
  }

  public getRetryAttempts(): Map<string, ConnectionRetry> {
    return new Map(this.connectionRetries);
  }

  public getHealthStatus() {
    return {
      activeConnections: this.connectedUsers.size,
      retryAttempts: this.connectionRetries.size,
      timestamp: new Date().toISOString()
    };
  }

  // Cleanup method for graceful shutdown
  public async shutdown() {
    console.log('🔌 Shutting down socket manager...');
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Disconnect all sockets
    this.io.disconnectSockets(true);

    // Clean up all connections
    for (const socketId of this.connectedUsers.keys()) {
      await this.cleanupConnection(socketId);
    }

    console.log('✅ Socket manager shutdown complete');
  }
}

export default SocketManager;
