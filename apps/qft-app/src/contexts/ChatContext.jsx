// apps/qft-app/src/contexts/ChatContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { socketService } from '../services/socketService';
import { ticketService } from '../services/ticketService';
import { useUser } from './UserContext';
import { checkPermission, CHAT_ACTIONS } from '../chatPermissions';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { userStatus } = useUser();
  const [messages, setMessages] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({}); // { roomId: [user1, user2] }
  const [dms, setDms] = useState([]);
  const [tickets, setTickets] = useState([]);
  const currentRoomRef = useRef(null);
  const lastSendAtRef = useRef(0);

  // Keep a ref to the latest currentRoom to avoid stale closures in socket handlers
  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  // Connect socket once when userStatus becomes available; do not reconnect on room changes
  useEffect(() => {
    const token = localStorage.getItem('qft-token');
    // Ensure userStatus is available and contains necessary data before connecting
    if (userStatus && userStatus.qft_uuid && userStatus.all_roles && token) {
      socketService.connect(token);

      const handleNewMessage = (message) => {
        // Only add the message if it belongs to the current room
        if (message.room_id === currentRoomRef.current) {
          setMessages((prevMessages) => [...prevMessages, message]);
        }
      };

      const handleUserListUpdate = ({ roomId, users }) => {
        setOnlineUsers(prevUsers => ({
          ...prevUsers,
          [roomId]: users,
        }));
      };

      const handleMessageDeleted = ({ messageId, roomId }) => {
        if (roomId === currentRoomRef.current) {
          setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
        }
      };

      const handleMessageEdited = ({ messageId, roomId, newContent, updatedAt }) => {
        if (roomId === currentRoomRef.current) {
            setMessages(prevMessages => prevMessages.map(msg => {
                if (msg.id === messageId) {
                    return { ...msg, content: newContent, updated_at: updatedAt };
                }
                return msg;
            }));
        }
      };

      const handleMessageHistory = ({ roomId, messages }) => {
        if (roomId === currentRoomRef.current) {
          setMessages(messages);
        }
      };

      const handleDmRoomCreated = ({ roomId, targetUser }) => {
        setDms(prevDms => {
          if (!prevDms.find(dm => dm.id === targetUser.qft_uuid)) {
            return [...prevDms, { id: targetUser.qft_uuid, name: targetUser.username }];
          }
          return prevDms;
        });
        joinRoom(roomId);
      };

      socketService.on('chat message', handleNewMessage);
      socketService.on('userListUpdate', handleUserListUpdate);
      socketService.on('messageDeleted', handleMessageDeleted);
      socketService.on('messageEdited', handleMessageEdited);
      socketService.on('messageHistory', handleMessageHistory);
      socketService.on('dm-room-created', handleDmRoomCreated);

      return () => {
        socketService.off('chat message', handleNewMessage);
        socketService.off('userListUpdate', handleUserListUpdate);
        socketService.off('messageDeleted', handleMessageDeleted);
        socketService.off('messageEdited', handleMessageEdited);
        socketService.off('messageHistory', handleMessageHistory);
        socketService.off('dm-room-created', handleDmRoomCreated);
        socketService.disconnect();
      };
    }
  }, [userStatus]);

  const joinRoom = useCallback((roomId) => {
    const prevRoom = currentRoomRef.current;
    if (prevRoom && prevRoom !== roomId) {
      socketService.emit('leaveRoom', prevRoom);
    }
    // Always emit joinRoom, even if already in the room, to ensure UI and socket are in sync
    setCurrentRoom(roomId);
    socketService.emit('joinRoom', roomId);
  }, []);

  const sendMessage = useCallback((content) => {
    if (!checkPermission(userStatus, CHAT_ACTIONS.SEND_MESSAGE)) {
      console.error("Permission denied: You cannot send messages.");
      // Here you could set an error state to show a toast/modal to the user
      return;
    }
    const roomId = currentRoomRef.current;
    if (roomId && content) {
      const now = Date.now();
      // Debounce quick repeated sends (prevent duplicate on rapid clicks/enter)
      if (now - lastSendAtRef.current < 250) return;
      lastSendAtRef.current = now;
      socketService.emit('chat message', { roomId, content });
    }
  }, [userStatus]);

  const deleteMessage = useCallback((messageId) => {
    socketService.emit('deleteMessage', { messageId });
  }, []);

  const editMessage = useCallback((messageId, newContent) => {
    socketService.emit('message.edit', { messageId, newContent });
  }, []);

  const startDm = useCallback((targetUserId) => {
    socketService.emit('joinDm', { targetUserId });
  }, []);

  const fetchTickets = useCallback(async (guildId) => {
    try {
      const fetchedTickets = await ticketService.listTickets(guildId);
      setTickets(fetchedTickets);
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
      setTickets([]); // Clear tickets on error
    }
  }, []);

  const contextValue = {
    messages,
    dms,
    tickets,
    fetchTickets,
    joinRoom,
    sendMessage,
    deleteMessage,
    editMessage,
    startDm,
    currentRoom,
    onlineUsers: onlineUsers[currentRoom] || [],
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
