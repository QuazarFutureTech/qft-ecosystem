// apps/qft-app/src/services/socketService.js
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let socket;

export const socketService = {
  connect(token) {
    // Prevent multiple connections
    if (socket && socket.connected) {
      return;
    }

    // Connect, passing the token for authentication
    socket = io(API_URL, {
      auth: {
        token: token,
      },
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    socket.on('error', (error) => {
      console.error('Socket Error:', error);
    });
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
    }
  },

  on(eventName, callback) {
    if (socket) {
      socket.on(eventName, callback);
    }
  },

  off(eventName, callback) {
    if (socket) {
      socket.off(eventName, callback);
    }
  },

  emit(eventName, data) {
    if (socket) {
      socket.emit(eventName, data);
    }
  },

  getSocket() {
    return socket;
  }
};
