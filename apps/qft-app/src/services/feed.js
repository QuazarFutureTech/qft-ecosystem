// src/services/feed.js

const API_GATEWAY_URL = 'http://localhost:3001'; // Assuming API Gateway URL

// Mock data for posts
let mockPosts = [
  {
    id: 'post1',
    title: 'Welcome to QFT App!',
    content: 'This is an announcement about the new features coming soon to the Quazar Future Tech application. Stay tuned for exciting updates!',
    author: 'QFT Admin',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    type: 'announcement',
  },
  {
    id: 'post2',
    title: 'Bot Update: New Commands Available',
    content: 'The QFT Agent bot has been updated with new moderation and utility commands. Check the #bot-commands channel for more details!',
    author: 'QFT Agent',
    timestamp: new Date(Date.now() - 86400000 * 0.5).toISOString(), // 12 hours ago
    type: 'bot-push',
  },
  {
    id: 'post3',
    title: 'User Activity: John Doe completed task #123',
    content: 'John Doe has successfully completed the "Initialize Project Setup" task. Great work, John!',
    author: 'System',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
    type: 'activity',
  },
  {
    id: 'post4',
    title: 'Reminder: Weekly Team Meeting',
    content: 'Just a friendly reminder about our weekly team meeting scheduled for Friday at 10 AM EST. Please come prepared with your updates.',
    author: 'QFT HR',
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
    type: 'announcement',
  },
  {
    id: 'post5',
    title: 'Blog Post: The Future of Quantum Computing',
    content: 'Read our latest blog post on the advancements in quantum computing and how it will shape the future of technology. Link in bio!',
    author: 'QFT Blog',
    timestamp: new Date(Date.now() - 86400000 * 0.2).toISOString(), // ~5 hours ago
    type: 'blog',
  },
];


export const fetchPosts = async (token) => {
  console.log("MOCK API: fetchPosts called");
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ success: true, data: mockPosts, message: "Mock posts fetched successfully." });
    }, 500); // Simulate network delay
  });
};

export const createPost = async (title, content, token) => {
  console.log("MOCK API: createPost called with", { title, content });
  return new Promise(resolve => {
    setTimeout(() => {
      const newPost = {
        id: `post${mockPosts.length + 1}`,
        title,
        content,
        author: 'Mock User', // Or a more dynamic mock author
        timestamp: new Date().toISOString(),
        type: 'activity', // Default type for new posts
      };
      mockPosts.unshift(newPost); // Add to the beginning of the mockPosts array
      resolve({ success: true, data: newPost, message: "Mock post created successfully." });
    }, 500); // Simulate network delay
  });
};

