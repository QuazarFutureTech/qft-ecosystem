// src/services/mockApi.js

// Mock user data that would come from the Discord API
const mockUser = {
  id: '123456789012345678',
  username: 'testuser',
  global_name: 'Test User', // Discord API returns global_name
  avatar: 'a_12345678901234567890123456789012', // A valid Discord avatar hash
  public_flags: 1 | 4 | 128, // Example flags: Staff (1), HypeSquad Events (4), HypeSquad Brilliance (128)
  is_owner: true, // Custom flag for admin status (not from Discord API directly)
  role: 'admin', // Custom flag for staff status (not from Discord API directly)
};

// Mock guilds data
const mockGuilds = [
  { id: '100000000000000001', name: 'QFT Official Server', icon: 'g1_icon', owner: true, permissions: '8', features: [] },
  { id: '100000000000000002', name: 'Development Sandbox', icon: 'g2_icon', owner: false, permissions: '1024', features: [] },
];

// Mock fetch function to simulate API calls
export const mockFetch = (url, options) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (url.includes('/users/@me')) {
        resolve({
          ok: true,
          json: () => Promise.resolve(mockUser),
        });
      } else if (url.includes('/users/@me/guilds')) {
        resolve({
          ok: true,
          json: () => Promise.resolve(mockGuilds),
        });
      } else {
        resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ message: 'Not Found' }),
        });
      }
    }, 500); // Simulate network delay
  });
};
