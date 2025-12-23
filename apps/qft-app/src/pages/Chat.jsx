// Chat.jsx - Modular chat + thread system (renamed from Feed)
import React, { useState, useEffect } from 'react';
import { fetchPosts, createPost } from '../services/feed';
import { getAllUsers } from '../services/users';
import { useUser } from '../contexts/UserContext.jsx';
import { getAvatarUrl } from '../services/user.js';
import Modal from '../components/elements/Modal.jsx';
import Breadcrumbs from '../components/elements/Breadcrumbs';
import { useModalLock } from '../hooks/useModalLock.js';
import '../assets/css/chat.css';
import { 
  FaComments, FaBullhorn, FaQuestionCircle, FaHeadset, FaUsers,
  FaPlus, FaTimes, FaPaperclip, FaImage, FaFile, FaLink,
  FaCircle, FaUser, FaBars, FaEnvelope, FaTicketAlt
} from 'react-icons/fa';

function Chat() {
  const { userStatus } = useUser();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Channel/View states
  const [activeChannel, setActiveChannel] = useState('general');
  const [activeView, setActiveView] = useState('channels'); // 'channels', 'messages', 'tickets'
  
  // Online users
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  
  // Post/Message creation modal
  const [showPostModal, setShowPostModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [postAttachments, setPostAttachments] = useState([]);
  
  // Attachments
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [attachmentType, setAttachmentType] = useState(null); // 'link', 'image', 'file'
  const [attachmentUrl, setAttachmentUrl] = useState('');
  
  // Sidebar state for mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useModalLock(showPostModal || selectedUserProfile);
  
  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  // Channel types
  const channels = [
    { id: 'announcements', name: 'Announcements', icon: FaBullhorn, type: 'announcement' },
    { id: 'general', name: 'General Chat', icon: FaComments, type: 'general' },
    { id: 'forum', name: 'Forum / Q&A', icon: FaQuestionCircle, type: 'forum' },
    { id: 'support', name: 'Support Threads', icon: FaHeadset, type: 'support' },
  ];

  useEffect(() => {
    loadPosts();
    loadOnlineUsers();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('qft-token');
      if (!token) {
        throw new Error("No authentication token found.");
      }
      const result = await fetchPosts(token);
      if (result.success) {
        setPosts(result.data);
      } else {
        setError(new Error(result.message));
      }
    } catch (err) {
      setError(err);
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const token = localStorage.getItem('qft-token');
      const data = await getAllUsers(token);
      // Simulate online status - in production, this would come from real-time presence
      const mockOnlineUsers = (data.users || []).slice(0, 10).map(user => ({
        ...user,
        status: ['online', 'idle', 'dnd'][Math.floor(Math.random() * 3)]
      }));
      setOnlineUsers(mockOnlineUsers);
    } catch (error) {
      console.error('Failed to load online users:', error);
    }
  };

  const handleOpenPostModal = () => {
    setShowPostModal(true);
    setNewPostTitle('');
    setNewPostContent('');
    setPostAttachments([]);
  };

  const handleAddAttachment = () => {
    if (!attachmentUrl.trim()) return;
    
    const attachment = {
      type: attachmentType,
      url: attachmentUrl,
      id: Date.now()
    };
    
    setPostAttachments([...postAttachments, attachment]);
    setAttachmentUrl('');
    setAttachmentType(null);
    setShowAttachmentMenu(false);
  };

  const handleRemoveAttachment = (id) => {
    setPostAttachments(postAttachments.filter(att => att.id !== id));
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      alert("Post title and content cannot be empty.");
      return;
    }

    const token = localStorage.getItem('qft-token');
    if (!token) {
      alert("No authentication token found. Please log in.");
      return;
    }

    // In production, attachments would be uploaded to CDN
    const postData = {
      title: newPostTitle,
      content: newPostContent,
      attachments: postAttachments,
      channel: activeChannel
    };

    const result = await createPost(newPostTitle, newPostContent, token);

    if (result.success) {
      setPosts(prevPosts => [result.data, ...prevPosts]);
      setShowPostModal(false);
      setNewPostTitle('');
      setNewPostContent('');
      setPostAttachments([]);
    } else {
      alert(result.message);
    }
  };

  const handleUserClick = (user) => {
    setSelectedUserProfile(user);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#43b581';
      case 'idle': return '#faa61a';
      case 'dnd': return '#f04747';
      default: return '#747f8d';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'online': return 'Online';
      case 'idle': return 'Idle';
      case 'dnd': return 'Do Not Disturb';
      default: return 'Offline';
    }
  };

  const channelMeta = channels.find(ch => ch.id === activeChannel);
  const currentLabel = activeChannel && activeChannel !== 'general' 
    ? `Chat › ${channelMeta?.name || 'Channel'}` 
    : 'Chat';

  const filteredPosts = posts.filter(post => {
    if (activeChannel === 'general') return true;
    const channel = channels.find(ch => ch.id === activeChannel);
    return post.type === channel?.type;
  });

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        
        <div>
          <h1><FaComments /> Chat</h1>
          <p>Community discussions, announcements, and support threads</p>
        </div>
        <Breadcrumbs currentLabel={currentLabel} />
        {/*<div className="header-actions">
          <button 
            className="qft-button primary"
            onClick={handleOpenPostModal}
          >
            <FaPlus /> New Post
          </button>
        </div>*/}
        
        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          <FaBars />
        </button>
      </div>
      
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="page-layout">
        {/* Left Sidebar - Channels & Online Users */}
        <aside className={`page-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="sidebar-nav">
            {/* View Selector */}
            <div className="sidebar-section">
              <div className="view-tabs">
                <button
                  className={`view-tab ${activeView === 'channels' ? 'active' : ''}`}
                  onClick={() => setActiveView('channels')}
                >
                  <FaComments /> Channels
                </button>
                <button
                  className={`view-tab ${activeView === 'messages' ? 'active' : ''}`}
                  onClick={() => setActiveView('messages')}
                >
                  <FaEnvelope /> Messages
                </button>
                <button
                  className={`view-tab ${activeView === 'tickets' ? 'active' : ''}`}
                  onClick={() => setActiveView('tickets')}
                >
                  <FaTicketAlt /> Tickets
                </button>
              </div>
            </div>

            {activeView === 'channels' && (
              <>
                {/* Channels List */}
                <div className="sidebar-section">
                  <h3 className="sidebar-section-title">Channels</h3>
                  {channels.map((channel, idx) => {
                    const IconComponent = channel.icon;
                    return (
                      <button
                        key={channel.id || idx}
                        className={`channel-item ${activeChannel === channel.id ? 'active' : ''}`}
                        onClick={() => { setActiveChannel(channel.id); closeSidebar(); }}
                      >
                        <IconComponent />
                        <span>{channel.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Online Users */}
                <div className="sidebar-section online-users-section">
                  <h3 className="sidebar-section-title">
                    <FaUsers /> Online Users ({onlineUsers.length})
                  </h3>
                  <div className="online-users-list">
                    {onlineUsers.map((user, idx) => (
                      <button
                        key={user.qft_uuid || idx}
                        className="online-user-item"
                        onClick={() => handleUserClick(user)}
                      >
                        <div className="user-avatar-status">
                          {user.avatar ? (
                            <img 
                              src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=32`} 
                              alt={user.discord_username}
                              className="user-avatar-small"
                            />
                          ) : (
                            <div className="avatar-placeholder-small">
                              <FaUser />
                            </div>
                          )}
                          <FaCircle 
                            className="status-indicator" 
                            style={{ color: getStatusColor(user.status) }}
                          />
                        </div>
                        <span className="user-name-online">{user.discord_username || user.username}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeView === 'messages' && (
              <div className="sidebar-section">
                <h3 className="sidebar-section-title">Direct Messages</h3>
                <p className="sidebar-placeholder">DM system coming soon</p>
              </div>
            )}

            {activeView === 'tickets' && (
              <div className="sidebar-section">
                <h3 className="sidebar-section-title">Support Tickets</h3>
                <p className="sidebar-placeholder">Ticket system coming soon</p>
              </div>
            )}
          </nav>
        </aside>

        {/* Main Content - Posts/Messages */}
        <main className="page-content">
          <div className="chat-container">
            {filteredPosts.length === 0 ? (
              <div className="qft-card empty-state">
                <FaComments size={64} opacity={0.3} />
                <h3>No posts yet</h3>
                <p>Be the first to start a conversation in {channels.find(ch => ch.id === activeChannel)?.name}</p>
              </div>
            ) : (
              <div className="posts-list">
                {filteredPosts.map((post, idx) => (
                  <div key={post.id || idx} className="qft-card chat-post-card">
                    <div className="post-author">
                      <div className="author-avatar">
                        <FaUser />
                      </div>
                      <div className="author-info">
                        <span className="author-name">{post.author || 'Anonymous'}</span>
                        <span className="post-timestamp">
                          {post.timestamp ? new Date(post.timestamp).toLocaleString() : 'Just now'}
                        </span>
                      </div>
                    </div>
                    <div className="post-content">
                      <h3 className="post-title">{post.title}</h3>
                      <p className="post-text">{post.content}</p>
                      {post.attachments && post.attachments.length > 0 && (
                        <div className="post-attachments">
                          {post.attachments.map((att, idx) => (
                            <div key={att.id || idx} className="attachment-item">
                              {att.type === 'link' && <FaLink />}
                              {att.type === 'image' && <FaImage />}
                              {att.type === 'file' && <FaFile />}
                              <a href={att.url} target="_blank" rel="noopener noreferrer">{att.url}</a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Chat Input Bar - Bottom Anchored */}
      <div className="chat-input-bar">
        <button 
          className="attachment-button"
          onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
          title="Add attachment"
        >
          <FaPaperclip />
        </button>
        
        <input
          type="text"
          className="chat-message-input"
          placeholder={`Message #${channels.find(ch => ch.id === activeChannel)?.name || 'channel'}...`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              setNewPostContent(e.target.value);
              setShowPostModal(true);
              e.target.value = '';
            }
          }}
        />
        
        <button 
          className="send-button qft-button primary"
          onClick={() => setShowPostModal(true)}
          title="Create post"
        >
          <FaPlus /> Post
        </button>
      </div>

      {/* Create Post Modal */}
      {showPostModal && (
        <div className="modal-overlay open" onClick={() => setShowPostModal(false)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FaPlus /> Create New Post</h2>
              <button className="modal-close" onClick={() => setShowPostModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Channel</label>
                <select 
                  className="qft-select"
                  value={activeChannel}
                  onChange={(e) => setActiveChannel(e.target.value)}
                >
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.id}>{ch.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  placeholder="Post title..."
                  className="qft-input"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Content</label>
                <textarea
                  placeholder="What's on your mind?"
                  className="qft-textarea"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={8}
                />
              </div>

              {/* Attachments */}
              <div className="form-group">
                <label>Attachments</label>
                <div className="attachments-section">
                  <button 
                    className="qft-button secondary small"
                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  >
                    <FaPaperclip /> Add Attachment
                  </button>

                  {showAttachmentMenu && (
                    <div className="attachment-menu">
                      <button onClick={() => setAttachmentType('link')}>
                        <FaLink /> Link
                      </button>
                      <button onClick={() => setAttachmentType('image')}>
                        <FaImage /> Image URL
                      </button>
                      <button onClick={() => setAttachmentType('file')}>
                        <FaFile /> File URL
                      </button>
                    </div>
                  )}

                  {attachmentType && (
                    <div className="attachment-input-group">
                      <input
                        type="text"
                        placeholder={`Enter ${attachmentType} URL...`}
                        className="qft-input"
                        value={attachmentUrl}
                        onChange={(e) => setAttachmentUrl(e.target.value)}
                      />
                      <button 
                        className="qft-button primary small"
                        onClick={handleAddAttachment}
                      >
                        Add
                      </button>
                      <button 
                        className="qft-button secondary small"
                        onClick={() => { setAttachmentType(null); setAttachmentUrl(''); }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {postAttachments.length > 0 && (
                    <div className="attachments-list">
                      {postAttachments.map(att => (
                        <div key={att.id} className="attachment-preview">
                          {att.type === 'link' && <FaLink />}
                          {att.type === 'image' && <FaImage />}
                          {att.type === 'file' && <FaFile />}
                          <span>{att.url}</span>
                          <button onClick={() => handleRemoveAttachment(att.id)}>
                            <FaTimes />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="qft-button secondary" onClick={() => setShowPostModal(false)}>
                Cancel
              </button>
              <button className="qft-button primary" onClick={handleCreatePost}>
                <FaPlus /> Publish Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Popup */}
      {selectedUserProfile && (
        <div className="modal-overlay open" onClick={() => setSelectedUserProfile(null)}>
          <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Profile</h2>
              <button className="modal-close" onClick={() => setSelectedUserProfile(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="user-profile-popup">
                <div className="popup-avatar">
                  {selectedUserProfile.avatar ? (
                    <img 
                      src={`https://cdn.discordapp.com/avatars/${selectedUserProfile.discord_id}/${selectedUserProfile.avatar}.png?size=128`} 
                      alt={selectedUserProfile.discord_username}
                    />
                  ) : (
                    <div className="avatar-placeholder-large">
                      <FaUser size={48} />
                    </div>
                  )}
                  <FaCircle 
                    className="status-indicator-large" 
                    style={{ color: getStatusColor(selectedUserProfile.status) }}
                  />
                </div>
                
                <h3>{selectedUserProfile.discord_username || selectedUserProfile.username}</h3>
                <p className="user-status-label">{getStatusLabel(selectedUserProfile.status)}</p>
                
                <div className="profile-info-compact">
                  <div className="info-row">
                    <span>Discord ID:</span>
                    <span>{selectedUserProfile.discord_id}</span>
                  </div>
                  <div className="info-row">
                    <span>QFT UUID:</span>
                    <span>
                      {selectedUserProfile.qft_uuid
                        ? `${selectedUserProfile.qft_uuid.substring(0, 8)}...`
                        : 'Not linked'}
                    </span>
                  </div>
                </div>

                <div className="profile-actions-popup">
                  <button className="qft-button primary">
                    <FaEnvelope /> Send Message
                  </button>
                  <button className="qft-button secondary">
                    <FaUser /> View Full Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;
