import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '../contexts/UserContext.jsx';
import { useHeader } from '../contexts/HeaderContext.jsx';
import { useSmartNav } from '../contexts/SmartNavContext.jsx';
import { useChat } from '../contexts/ChatContext.jsx';
import { useSelectedGuild } from '../contexts/SelectedGuildContext.jsx';
import ChatSmartNav from './ChatSmartNav.jsx';
import Modal from '../components/elements/Modal.jsx';
import Breadcrumbs from '../components/elements/Breadcrumbs';
import './Chat.css';
import {
  FaComments, FaBullhorn, FaQuestionCircle, FaHeadset,
  FaPlus, FaUser, FaChevronRight, FaTrash, FaPencilAlt
} from 'react-icons/fa';
import { checkPermission, CHAT_ACTIONS } from '../chatPermissions';

// Placeholder data - this will be expanded
const channels = [
  { id: 'announcements', name: 'Announcements', icon: FaBullhorn },
  { id: 'general', name: 'General Chat', icon: FaComments },
  { id: 'forum', name: 'Forum / Q&A', icon: FaQuestionCircle },
  { id: 'support', name: 'Support Threads', icon: FaHeadset },
];

function Chat() {
  const { userStatus } = useUser();
  const { setHeaderContent } = useHeader();
  const { setSmartNavContent } = useSmartNav();
  const { 
    messages, joinRoom, sendMessage, onlineUsers, deleteMessage, editMessage,
    dms, startDm, currentRoom, tickets, fetchTickets 
  } = useChat();
  const { selectedGuild } = useSelectedGuild();

  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [editingMessage, setEditingMessage] = useState(null); // { id, content }

  useEffect(() => {
    // Set a default channel if none is selected
    if (!currentRoom) {
      joinRoom('channel:general');
    }
  }, [currentRoom, joinRoom]);

  useEffect(() => {
    if (selectedGuild) {
      fetchTickets(selectedGuild.id);
    }
  }, [selectedGuild, fetchTickets]);

  const handleSendMessage = () => {
    if (!newMessageContent.trim()) return;
    sendMessage(newMessageContent);
    setNewMessageContent('');
  };

  const handleUserClick = useCallback((user) => {
    // Open a DM channel instead of a modal
    if (user.qft_uuid !== userStatus.qft_uuid) {
      startDm(user.qft_uuid);
    }
  }, [startDm, userStatus]);

  const handleStartEdit = (message) => {
    setEditingMessage({ id: message.id, content: message.content });
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
  };

  const handleSaveEdit = () => {
    if (!editingMessage) return;
    editMessage(editingMessage.id, editingMessage.content);
    setEditingMessage(null);
  };
  
  // --- Deriving metadata from currentRoom ---
  const { channelType, channelId } = useMemo(() => {
    if (!currentRoom) return { channelType: null, channelId: null };
    const [type, ...idParts] = currentRoom.split(':');
    return { channelType: type, channelId: idParts.join(':') };
  }, [currentRoom]);

  const channelMeta = useMemo(() => {
    if (channelType === 'channel') {
      return channels.find(ch => ch.id === channelId);
    }
    if (channelType === 'dm') {
      // For DMs, find the other user's name from the full room ID
      const otherUserQftId = channelId.split(':').find(id => id !== userStatus?.qft_uuid);
      const dmUser = dms.find(dm => dm.id === otherUserQftId);
      return { name: dmUser ? `@${dmUser.name}` : 'Direct Message' };
    }
    if (channelType === 'ticket') {
      const ticket = tickets.find(t => t.id === parseInt(channelId, 10));
      return { name: ticket ? `Ticket #${ticket.ticket_number}` : 'Ticket' };
    }
    // Fallback
    return { name: channelId }; 
  }, [channelType, channelId, dms, tickets, userStatus]);


  const breadcrumbItems = useMemo(() => [
    { label: 'Chat', path: '/chat' },
    ...(channelMeta ? [{ label: channelMeta.name, path: null }] : [])
  ], [channelMeta]);

  useEffect(() => {
    setHeaderContent({
      title: (<><FaComments /> Chat</>),
      breadcrumbs: <Breadcrumbs items={breadcrumbItems} />,
    });
    return () => setHeaderContent(null);
  }, [setHeaderContent, breadcrumbItems]);

  useEffect(() => {
    setSmartNavContent(
      <ChatSmartNav
        channels={channels}
        dms={dms}
        tickets={tickets}
        onlineUsers={onlineUsers}
        activeChannel={currentRoom}
        onChannelClick={joinRoom}
        onUserClick={handleUserClick}
      />
    );
    return () => setSmartNavContent(null);
  }, [setSmartNavContent, dms, tickets, onlineUsers, currentRoom, joinRoom, handleUserClick]);

  return (
    <div className="chat-page-layout">
      <div className="chat-messages-container">
        <div className="posts-list">
          {messages.length === 0 ? (
            <div className="qft-card empty-state">
              <FaComments size={64} opacity={0.3} />
              <h3>No messages yet in {channelMeta?.name}</h3>
              <p>Be the first to start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isAuthor = msg.author?.qft_uuid === userStatus?.qft_uuid;
                const canDelete = (isAuthor && checkPermission(userStatus, CHAT_ACTIONS.DELETE_OWN_MESSAGE)) ||
                                  checkPermission(userStatus, CHAT_ACTIONS.DELETE_ANY_MESSAGE);
                const canEdit = (isAuthor && checkPermission(userStatus, CHAT_ACTIONS.EDIT_OWN_MESSAGE)) ||
                                checkPermission(userStatus, CHAT_ACTIONS.EDIT_ANY_MESSAGE);

                return (
                  <div key={msg.id} className="qft-card chat-post-card">
                    {editingMessage && editingMessage.id === msg.id ? (
                      <div className="edit-message-container">
                        <input
                          type="text"
                          className="chat-message-input"
                          value={editingMessage.content}
                          onChange={(e) => setEditingMessage({ ...editingMessage, content: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
                            if (e.key === 'Escape') { handleCancelEdit(); }
                          }}
                        />
                        <div className="edit-actions">
                          <button onClick={handleSaveEdit} className="save-button">Save</button>
                          <button onClick={handleCancelEdit} className="cancel-button">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="post-author">
                          <div className="author-avatar">
                            <FaUser />
                          </div>
                          <div className="author-info">
                            <span className="author-name">{msg.author?.username || 'Anonymous'}</span>
                            <span className="post-timestamp">
                              {msg.created_at ? new Date(msg.created_at).toLocaleString() : 'Just now'}
                              {msg.updated_at && <span className="edited-indicator">(edited)</span>}
                            </span>
                          </div>
                        </div>
                        <div className="post-content">
                          <p className="post-text">{msg.content}</p>
                        </div>
                        {(canDelete || canEdit) && (
                          <div className="post-actions">
                            {canEdit && (
                              <button onClick={() => handleStartEdit(msg)} className="edit-button" title="Edit message">
                                <FaPencilAlt />
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => deleteMessage(msg.id)} className="delete-button" title="Delete message">
                                <FaTrash />
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      <div className="chat-input-container">
        <div className="chat-input-bar">
          <button className="attachment-button" title="Add attachment">
            <FaPlus />
          </button>
          <input
            type="text"
            className="chat-message-input"
            placeholder={`Message ${channelMeta?.name || 'chat'}...`}
            value={newMessageContent}
            onChange={(e) => setNewMessageContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <button className="send-button" onClick={handleSendMessage} title="Send">
            <FaChevronRight />
          </button>
        </div>
      </div>

      {selectedUserProfile && (
        <Modal isOpen={!!selectedUserProfile} onClose={() => setSelectedUserProfile(null)}>
            <div className="user--profile-popup">
                <h3>{selectedUserProfile.username}</h3>
                <p>{selectedUserProfile.qft_uuid}</p>
            </div>
        </Modal>
      )}
    </div>
  );
}

export default Chat;
