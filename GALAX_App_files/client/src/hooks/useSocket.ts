/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketHealthStatus {
  connected: boolean;
  authenticated: boolean;
  retryAttempts: number;
  maxRetries: number;
  lastError: string | null;
  connectionTime: number | null;
}

export function useSocket(token: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [health, setHealth] = useState<SocketHealthStatus>({
    connected: false,
    authenticated: false,
    retryAttempts: 0,
    maxRetries: 5,
    lastError: null,
    connectionTime: null
  });
  
  const retryTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const connectionStartTime = useRef<number>(0);

  useEffect(() => {
    if (!token) {
      cleanup();
      return;
    }

    initializeSocket();

    return () => {
      cleanup();
    };
  }, [token]);

  const initializeSocket = () => {
    if (socketRef.current?.connected) {
      return; // Already connected
    }

    connectionStartTime.current = Date.now();
    
    console.log('🔌 Initializing socket connection...');
    
    socketRef.current = io(
      process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001',
      {
        auth: { token },
        timeout: 10000,
        reconnection: false, // We handle reconnection manually
        forceNew: true
      }
    );

    setupEventHandlers();
  };

  const setupEventHandlers = () => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    // Connection successful
    socket.on('connect', () => {
      const connectionTime = Date.now() - connectionStartTime.current;
      console.log(`✅ Socket connected in ${connectionTime}ms`);
      
      setHealth(prev => ({
        ...prev,
        connected: true,
        lastError: null,
        connectionTime,
        retryAttempts: 0
      }));
      
      // Authenticate immediately after connection
      socket.emit('authenticate', token);
      
      // Clear any pending retry
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = undefined;
      }
    });

    // Authentication successful
    socket.on('authenticated', (data) => {
      console.log('🔐 Socket authenticated successfully:', data);
      setHealth(prev => ({
        ...prev,
        authenticated: true,
        lastError: null
      }));
      
      // Start heartbeat monitoring
      startHeartbeat();
    });

    // Authentication failed
    socket.on('auth_error', (error) => {
      console.error('❌ Socket authentication failed:', error);
      setHealth(prev => ({
        ...prev,
        authenticated: false,
        lastError: error.message || 'Authentication failed'
      }));
    });

    // Connection error
    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setHealth(prev => ({
        ...prev,
        connected: false,
        lastError: error.message || 'Connection failed'
      }));
      
      handleReconnection();
    });

    // Disconnection
    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setHealth(prev => ({
        ...prev,
        connected: false,
        authenticated: false,
        lastError: reason
      }));
      
      stopHeartbeat();
      
      // Only reconnect if disconnection wasn't intentional
      if (reason !== 'io client disconnect') {
        handleReconnection();
      }
    });

    // Server ping for heartbeat
    socket.on('ping', (data) => {
      socket.emit('pong', data);
    });

    // Connection retry response
    socket.on('connection_retry', (data) => {
      console.log(`🔄 Connection retry ${data.attempt}/${data.maxRetries}`);
      setHealth(prev => ({
        ...prev,
        retryAttempts: data.attempt,
        maxRetries: data.maxRetries
      }));
    });

    // Max retries reached
    socket.on('max_retries_reached', (data) => {
      console.error('❌ Maximum retry attempts reached:', data);
      setHealth(prev => ({
        ...prev,
        lastError: 'Maximum retry attempts reached'
      }));
    });

    // Idle timeout warning
    socket.on('idle_timeout', (data) => {
      console.warn('⏰ Connection closed due to inactivity:', data);
      setHealth(prev => ({
        ...prev,
        lastError: `Idle timeout: ${data.idleTime} minutes`
      }));
    });

    // Room joined confirmation
    socket.on('room_joined', (data) => {
      console.log('🏠 Joined room:', data.roomId);
    });

    // Room left confirmation
    socket.on('room_left', (data) => {
      console.log('🚪 Left room:', data.roomId);
    });

    // Message sent confirmation
    socket.on('message_sent', (data) => {
      console.log('✅ Message sent:', data.messageId);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      setHealth(prev => ({
        ...prev,
        lastError: error.message || 'Socket error occurred'
      }));
    });

    // Error handled confirmation
    socket.on('error_handled', (data) => {
      console.log('🔧 Error handled by server:', data);
    });
  };

  const startHeartbeat = () => {
    stopHeartbeat(); // Clear any existing heartbeat
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        // Check if we received a ping recently (heartbeat check)
        // This is handled automatically by the socket.io client
      } else {
        console.warn('⚠️ Heartbeat failed - socket not connected');
        stopHeartbeat();
        handleReconnection();
      }
    }, 35000); // Check every 35 seconds (server sends ping every 30s)
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
  };

  const handleReconnection = () => {
    if (retryTimeoutRef.current) {
      return; // Already attempting reconnection
    }

    setHealth(prev => {
      const newRetryAttempts = prev.retryAttempts + 1;
      
      if (newRetryAttempts >= prev.maxRetries) {
        console.error('❌ Maximum reconnection attempts reached');
        return {
          ...prev,
          retryAttempts: newRetryAttempts,
          lastError: 'Maximum reconnection attempts reached'
        };
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = Math.min(1000 * Math.pow(2, newRetryAttempts - 1), 16000);
      
      console.log(`🔄 Scheduling reconnection attempt ${newRetryAttempts}/${prev.maxRetries} in ${delay}ms`);
      
      retryTimeoutRef.current = setTimeout(() => {
        retryTimeoutRef.current = undefined;
        
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
        
        initializeSocket();
      }, delay);

      return {
        ...prev,
        retryAttempts: newRetryAttempts,
        lastError: `Reconnecting in ${delay}ms (attempt ${newRetryAttempts}/${prev.maxRetries})`
      };
    });
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up socket connection...');
    
    // Clear timeouts and intervals
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = undefined;
    }
    
    stopHeartbeat();
    
    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    // Reset health status
    setHealth({
      connected: false,
      authenticated: false,
      retryAttempts: 0,
      maxRetries: 5,
      lastError: null,
      connectionTime: null
    });
  };

  const forceReconnect = () => {
    console.log('🔄 Forcing socket reconnection...');
    
    setHealth(prev => ({
      ...prev,
      retryAttempts: 0,
      lastError: null
    }));
    
    cleanup();
    
    if (token) {
      setTimeout(() => {
        initializeSocket();
      }, 1000);
    }
  };

  const getConnectionHealth = () => health;

  return {
    socket: socketRef.current,
    health,
    forceReconnect,
    getConnectionHealth,
    cleanup
  };
}
