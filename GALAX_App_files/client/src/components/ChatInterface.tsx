/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, MessageCircle } from 'lucide-react';

interface Message {
  id: number;
  message: string;
  sender: string;
  avatar: string | null;
  timestamp: string;
}

interface ChatInterfaceProps {
  helpRequestId: number;
  currentUser: string;
}

export function ChatInterface({ helpRequestId, currentUser }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const token = localStorage.getItem('token');
  const socketConnection = useSocket(token);
  const socket = socketConnection?.socket;

  useEffect(() => {
    fetchMessages();
  }, [helpRequestId]);

  useEffect(() => {
    if (socket) {
      socket.emit('join_help_request', helpRequestId);
      
      socket.on('new_message', (message: Message) => {
        setMessages(prev => [...prev, message]);
      });
      
      return () => {
        socket.off('new_message');
      };
    }
  }, [socket, helpRequestId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chat/${helpRequestId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.map((msg: any) => ({
          id: msg.id,
          message: msg.message,
          sender: msg.sender_username,
          avatar: msg.sender_avatar,
          timestamp: msg.created_at
        })));
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket) return;

    socket.emit('send_message', {
      helpRequestId,
      message: newMessage.trim()
    });

    setNewMessage('');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
            <span className="ml-2 text-sm text-gray-600">Loading messages...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5" />
          Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        <div className="h-64 overflow-y-auto space-y-3 p-3 bg-gray-50 rounded-lg">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.sender === currentUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.sender !== currentUser && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.avatar || ''} />
                    <AvatarFallback className="text-xs">
                      {getInitials(message.sender)}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    message.sender === currentUser
                      ? 'bg-purple-500 text-white'
                      : 'bg-white border'
                  }`}
                >
                  <p className="text-sm">{message.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === currentUser
                        ? 'text-purple-100'
                        : 'text-gray-500'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
                
                {message.sender === currentUser && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.avatar || ''} />
                    <AvatarFallback className="text-xs">
                      {getInitials(message.sender)}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
