import React, { useState, useEffect } from 'react';
import { fetchPosts, createPost } from '../services/feed';
import { useUser } from '../contexts/UserContext.jsx';
import { getAvatarUrl } from '../services/user.js';
import Modal from '../components/elements/Modal.jsx';
import CollapsibleCategory from '../components/elements/CollapsibleCategory';
import { FaRss, FaFilter, FaSortAmountDown, FaPlus, FaNewspaper, FaBullhorn, FaRobot, FaBook, FaBars } from 'react-icons/fa';

function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const { userStatus } = useUser();
  
  // Filter and sort states
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [filteredPosts, setFilteredPosts] = useState([]);
  
  // Sidebar state for mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Close sidebar on mobile when item clicked
  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalConfirmAction, setModalConfirmAction] = useState(null);

  const confirmAction = (message, isConfirm = true, title = "Confirmation") => {
    return new Promise((resolve) => {
      setModalTitle(title);
      setModalMessage(message);
      setIsModalOpen(true);
      setModalConfirmAction(() => (confirmed) => {
        setIsModalOpen(false);
        resolve(confirmed);
      });
    });
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      await confirmAction("Post title and content cannot be empty.", false, "Validation Error");
      return;
    }

    const token = localStorage.getItem('qft-token'); // Get token from localStorage
    if (!token) {
      await confirmAction("No authentication token found. Please log in.", false, "Authentication Error");
      return;
    }

    const result = await createPost(newPostTitle, newPostContent, token);

    if (result.success) {
      await confirmAction(result.message, false, "Success");
      // Prepend new post to the list (assuming result.data is the new post object)
      setPosts(prevPosts => [result.data, ...prevPosts]);
      setNewPostTitle('');
      setNewPostContent('');
    } else {
      await confirmAction(result.message, false, "Error");
    }
  };

  useEffect(() => {
    const getPosts = async () => {
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
        console.error("Error fetching feed posts:", err);
      } finally {
        setLoading(false);
      }
    };

    getPosts();
  }, []);

  // Filter and sort posts
  useEffect(() => {
    let filtered = [...posts];

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(post => post.type === selectedCategory);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.timestamp) - new Date(a.timestamp);
      } else if (sortBy === 'oldest') {
        return new Date(a.timestamp) - new Date(b.timestamp);
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    setFilteredPosts(filtered);
  }, [posts, selectedCategory, sortBy]);

  const avatarUrl = userStatus ? getAvatarUrl(userStatus) : null;

  if (loading) {
    return (
      <div className="page-content feed-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading feed...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content feed-page">
        <div className="qft-card error-state">
          <h3>Error loading feed</h3>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1><FaRss /> Activity Feed</h1>
          <p>Stay updated with the latest posts, announcements, and bot activities</p>
        </div>
        {/* Mobile Sidebar Toggle */}
        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          <FaBars />
        </button>
      </div>
      
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="page-layout">
        {/* Sidebar with Categories */}
        <aside className={`page-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="sidebar-nav">
            {/* Categories Section */}
            <div className="sidebar-section">
              <h3 className="browser-section-title">Categories</h3>
              <button
                className={`feed-category-item ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => { setSelectedCategory('all'); closeSidebar(); }}
              >
                <FaRss /> All Posts
              </button>
              <button
                className={`feed-category-item ${selectedCategory === 'announcement' ? 'active' : ''}`}
                onClick={() => { setSelectedCategory('announcement'); closeSidebar(); }}
              >
                <FaBullhorn /> Announcements
              </button>
              <button
                className={`feed-category-item ${selectedCategory === 'bot-push' ? 'active' : ''}`}
                onClick={() => { setSelectedCategory('bot-push'); closeSidebar(); }}
              >
                <FaRobot /> Bot Updates
              </button>
              <button
                className={`feed-category-item ${selectedCategory === 'activity' ? 'active' : ''}`}
                onClick={() => { setSelectedCategory('activity'); closeSidebar(); }}
              >
                <FaNewspaper /> Activities
              </button>
              <button
                className={`feed-category-item ${selectedCategory === 'blog' ? 'active' : ''}`}
                onClick={() => { setSelectedCategory('blog'); closeSidebar(); }}
              >
                <FaBook /> Blog Posts
              </button>
            </div>

            {/* Sort Options */}
            <div className="sidebar-section">
              <label className="sidebar-section-title">Sort By</label>
              <select 
                className="filter-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>

            {/* Feed Stats */}
            <div className="sidebar-section">
              <h3 className="sidebar-section-title">Stats</h3>
              <div className="feed-stats-compact">
                <div className="stat-box-compact">
                  <span className="stat-number">{posts.length}</span>
                  <span className="stat-text">Total</span>
                </div>
                <div className="stat-box-compact">
                  <span className="stat-number">{posts.filter(p => p.type === 'announcement').length}</span>
                  <span className="stat-text">Announcements</span>
                </div>
                <div className="stat-box-compact">
                  <span className="stat-number">{posts.filter(p => p.type === 'bot-push').length}</span>
                  <span className="stat-text">Bot Updates</span>
                </div>
                <div className="stat-box-compact">
                  <span className="stat-number">{posts.filter(p => p.type === 'activity').length}</span>
                  <span className="stat-text\">Activities</span>
                </div>
                <div className="stat-box-compact">
                  <span className="stat-number">{posts.filter(p => p.type === 'blog').length}</span>
                  <span className="stat-text">Blog Posts</span>
                </div>
              </div>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="page-content">
          {/* Create New Post (Admin Only) */}
          {userStatus?.isAdmin && (
            <CollapsibleCategory
              title="Create New Post"
              icon={FaPlus}
              defaultOpen={false}
            >
              <div className="qft-card">
                <div className="create-post-form">
                  <input
                    type="text"
                    placeholder="Post Title"
                    className="qft-input"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                  />
                  <textarea
                    placeholder="What's on your mind?"
                    className="qft-textarea"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    rows={6}
                  />
                  <button
                    className="qft-button primary"
                    onClick={handleCreatePost}
                  >
                    <FaNewspaper /> Publish Post
                  </button>
                </div>
              </div>
            </CollapsibleCategory>
          )}

          {/* Posts Grid */}
          <div className="posts-container">
            {filteredPosts.length === 0 ? (
              <div className="qft-card empty-state">
                <FaRss size={64} opacity={0.3} />
                <h3>No posts found</h3>
                <p>{selectedCategory !== 'all' ? 'Try changing your category' : 'No activity yet'}</p>
              </div>
            ) : (
              filteredPosts.map(post => (
                <div key={post.id} className="qft-card post-card">
                  <div className="post-icon">
                    {post.type === 'bot-push' && <FaRobot size={32} />}
                    {post.type === 'announcement' && <FaBullhorn size={32} />}
                    {post.type === 'activity' && <FaNewspaper size={32} />}
                    {post.type === 'blog' && <FaBook size={32} />}
                    {!post.type && <FaNewspaper size={32} />}
                  </div>
                  <div className="post-content">
                    <h3 className="post-title">{post.title}</h3>
                    <p className="post-text">{post.content}</p>
                    <div className="post-meta">
                      {post.author && <span className="post-author">Posted by: {post.author}</span>}
                      {post.timestamp && (
                        <span className="post-timestamp">
                          {new Date(post.timestamp).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* Modal Component for Confirmations/Alerts */}
      <Modal
        isOpen={isModalOpen}
        title={modalTitle}
        onClose={() => modalConfirmAction(false)}
        showCancelButton={modalConfirmAction !== null}
        onConfirm={() => modalConfirmAction(true)}
      >
        <p>{modalMessage}</p>
      </Modal>
    </div>
  );
}

export default Feed;