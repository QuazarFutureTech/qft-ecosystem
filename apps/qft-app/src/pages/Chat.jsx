// Chat.jsx - Modular chat + thread system (renamed from Feed)
import React, { useState, useEffect, useCallback } from 'react';
import { fetchPosts, createPost } from '../services/feed';
import { getAllUsers } from '../services/users';
import { useUser } from '../contexts/UserContext.jsx';
import { useHeader } from '../contexts/HeaderContext.jsx'; // Import useHeader
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
  const { setHeaderContent } = useHeader(); // Use setHeaderContent
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
  
  const closeSidebar = useCallback(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

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
  
    const breadcrumbItems = [
      { label: 'Chat', path: '/chat' },
      ...(channelMeta && activeChannel !== 'general' ? [{ label: channelMeta.name, path: null }] : [])
    ];
  
    const filteredPosts = posts.filter(post => {
      if (activeChannel === 'general') return true;
      const channel = channels.find(ch => ch.id === activeChannel);
      return post.type === channel?.type;
    });
  
    useEffect(() => {
      setHeaderContent({
        title: (<h1><FaComments /> Chat</h1>),
        subtitle: 'Community discussions, announcements, and support threads',
        breadcrumbs: <Breadcrumbs items={breadcrumbItems} />,
        actions: (
          <button 
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <FaBars />
          </button>
        ),
      });
  

      return () => setHeaderContent(null);
    }, [setHeaderContent, breadcrumbItems, toggleSidebar]);

    // ...existing code...
    // (Rest of the Chat component remains unchanged)
  }

  export default Chat;
