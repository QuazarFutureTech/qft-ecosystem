import { useState, useEffect, useCallback } from 'react';
import { checkPermission, CHAT_ACTIONS } from '../utils/chatPermissions';

export const useChatFeatures = (socket, user, roomId, initialMessages = []) => {
  const [messages, setMessages] = useState(initialMessages);

  // --- Socket Event Listeners ---
  useEffect(() => {
    if (!socket) return;

    const handleMessageEdit = ({ messageId, newContent, updatedAt }) => {
      setMessages((prev) => 
        prev.map((msg) => (msg.id === messageId ? { ...msg, content: newContent, updatedAt, isEdited: true } : msg))
      );
    };

    const handleMessageDelete = ({ messageId }) => {
      setMessages((prev) => 
        prev.map((msg) => (msg.id === messageId ? { ...msg, isDeleted: true, content: 'This message has been deleted.' } : msg))
      );
    };

    const handleMessagePinned = ({ messageId }) => {
       setMessages((prev) => {
        const updatedMessages = prev.map((msg) => (msg.id === messageId ? { ...msg, isPinned: true } : msg));
        // Sort to bring pinned messages to the top
        return updatedMessages.sort((a, b) => (b.isPinned - a.isPinned) || (new Date(a.created_at) - new Date(b.created_at)));
       });
    };

    const handleMessageUnpinned = ({ messageId }) => {
       setMessages((prev) => {
        const updatedMessages = prev.map((msg) => (msg.id === messageId ? { ...msg, isPinned: false } : msg));
        // Sort to maintain order, with unpinned messages no longer prioritized
        return updatedMessages.sort((a, b) => (b.isPinned - a.isPinned) || (new Date(a.created_at) - new Date(b.created_at)));
       });
    };

    socket.on('messageEdited', handleMessageEdit);
    socket.on('messageDeleted', handleMessageDelete);
    socket.on('messagePinned', handleMessagePinned);
    socket.on('messageUnpinned', handleMessageUnpinned);

    return () => {
      socket.off('messageEdited', handleMessageEdit);
      socket.off('messageDeleted', handleMessageDelete);
      socket.off('messagePinned', handleMessagePinned);
      socket.off('messageUnpinned', handleMessageUnpinned);
    };
  }, [socket]);

  // --- Actions ---

  const editMessage = useCallback(async (messageId, newContent) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const isAuthor = message.author.qft_uuid === user.qft_uuid;
    const canEdit = (isAuthor && checkPermission(user, CHAT_ACTIONS.EDIT_OWN_MESSAGE)) ||
                    (!isAuthor && checkPermission(user, CHAT_ACTIONS.EDIT_ANY_MESSAGE));

    if (!canEdit) {
        console.error("Permission denied: You cannot edit this message.");
        // Optionally revert optimistic UI here or handle with server response
        return;
    }

    // Optimistic Update
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, content: newContent, isEdited: true } : msg));
    
    // Server will broadcast the actual update, no need to handle response here unless for error
    socket.emit('message.edit', { messageId, newContent, roomId });
  }, [messages, user, roomId, socket]);

  const deleteMessage = useCallback(async (messageId) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const isAuthor = message.author.qft_uuid === user.qft_uuid;
    const canDelete = (isAuthor && checkPermission(user, CHAT_ACTIONS.DELETE_OWN_MESSAGE)) ||
                      (!isAuthor && checkPermission(user, CHAT_ACTIONS.DELETE_ANY_MESSAGE));

    if (!canDelete) {
      console.error("Permission denied: You cannot delete this message.");
      // Optionally revert optimistic UI here or handle with server response
      return;
    }

    // Optimistic Update
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, isDeleted: true, content: 'This message has been deleted.' } : msg));

    // Server will broadcast the actual update, no need to handle response here unless for error
    socket.emit('deleteMessage', { messageId, roomId });
  }, [messages, user, roomId, socket]);

  const togglePinMessage = useCallback(async (messageId, currentPinnedStatus) => {
    if (!checkPermission(user, CHAT_ACTIONS.PIN_MESSAGE)) {
      console.error("Permission denied: You cannot pin/unpin messages.");
      return;
    }

    const event = currentPinnedStatus ? 'message.unpin' : 'message.pin';
    
    // Optimistic Update
    setMessages(prev => {
        const updatedMessages = prev.map(msg => msg.id === messageId ? { ...msg, isPinned: !currentPinnedStatus } : msg);
        return updatedMessages.sort((a, b) => (b.isPinned - a.isPinned) || (new Date(a.created_at) - new Date(b.created_at)));
    });

    // Server will broadcast the actual update, no need to handle response here unless for error
    socket.emit(event, { messageId, roomId });
  }, [user, roomId, socket]);

  return {
    messages,
    setMessages,
    editMessage,
    deleteMessage,
    togglePinMessage
  };
};