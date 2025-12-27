const db = require('../db');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const { checkPermission, CHAT_ACTIONS } = require('../utils/chatPermissions');

const initializeChat = (io) => {
  let redisClient;
  if (process.env.REDIS_URL) {
    console.log('Redis URL found, initializing Redis adapter...');
    redisClient = createClient({ url: process.env.REDIS_URL });

    redisClient.on('error', (err) => console.error('Redis Client Error', err));

    redisClient.connect()
      .then(() => {
        console.log('✅ Redis client connected');
        const pubClient = redisClient.duplicate();
        const subClient = redisClient.duplicate();
        Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
          io.adapter(createAdapter(pubClient, subClient));
        });
      })
      .catch((err) => {
        console.error('Failed to connect to Redis, falling back to in-memory adapter.', err);
        // No adapter needed for fallback, Socket.IO uses in-memory by default.
        redisClient = null; // Ensure redisClient is null on connection failure
      });
  } else {
    console.log('No Redis URL found, using in-memory adapter for Socket.IO.');
  }

  // Middleware for authenticating socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    console.log('Socket Auth: Incoming token:', token ? 'Provided' : 'Not Provided');

    if (!token) {
      console.error('Socket Auth: No token provided.');
      return next(new Error('Authentication error: No token provided.'));
    }

    if (!token.startsWith('QFT_IDENTITY_')) {
      console.error('Socket Auth: Invalid token format. Token:', token);
      return next(new Error('Authentication error: Invalid token format.'));
    }

    const qftUuid = token.replace('QFT_IDENTITY_', '');
    console.log('Socket Auth: Extracted qftUuid:', qftUuid);

    try {
      const userResult = await db.query(
        `SELECT 
           u.qft_uuid, 
           u.discord_id, 
           u.username,
           ARRAY_AGG(r.name) AS roles -- Aggregate role names into an array
         FROM users u
         LEFT JOIN user_roles ur ON u.discord_id = ur.user_discord_id
         LEFT JOIN roles r ON ur.role_id = r.id
         WHERE u.qft_uuid = $1
         GROUP BY u.qft_uuid, u.discord_id, u.username;`,
        [qftUuid]
      );
      console.log('Socket Auth: User query result rows:', userResult.rows.length);

      if (userResult.rows.length === 0) {
        console.error('Socket Auth: User not found for qftUuid:', qftUuid);
        return next(new Error('Authentication error: User not found.'));
      }

      socket.user = userResult.rows[0]; // Attach user data to the socket object
      socket.qftUuid = socket.user.qft_uuid; // Store qftUuid directly on socket for easy access
      socket.joinedRooms = new Set(); // Keep track of rooms the user has joined

      if (redisClient) {
        // Store user's details in Redis Hash for quick lookup by qftUuid
        await redisClient.hSet(`user:${socket.qftUuid}`, {
          qft_uuid: socket.user.qft_uuid,
          discord_id: socket.user.discord_id,
          username: socket.user.username,
          roles: JSON.stringify(socket.user.roles || []), // Store roles as JSON string
        });
        console.log('Socket Auth: User authenticated and data stored in Redis:', socket.user.username);
      }
      next();
    } catch (err) {
      console.error('Socket auth middleware error:', err);
      return next(new Error('Authentication error: Server error.'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.username} (Socket ID: ${socket.id})`);

    const broadcastUserList = async (roomId) => {
        if (redisClient) {
            const userQftUuidsInRoom = await redisClient.sMembers(`room:${roomId}:users`);
            const usersInRoom = [];

            for (const qftUuid of userQftUuidsInRoom) {
                const userData = await redisClient.hGetAll(`user:${qftUuid}`);
                if (Object.keys(userData).length > 0) {
                    if (userData.roles) {
                        try {
                            userData.roles = JSON.parse(userData.roles);
                        } catch (e) {
                            userData.roles = [];
                        }
                    } else {
                        userData.roles = [];
                    }
                    usersInRoom.push(userData);
                }
            }
            io.to(roomId).emit('userListUpdate', { roomId, users: usersInRoom });
        } else {
            // Fallback for in-memory adapter
            const socketsInRoom = await io.in(roomId).fetchSockets();
            const usersInRoom = socketsInRoom.map(s => ({
                qft_uuid: s.qftUuid,
                discord_id: s.user.discord_id,
                username: s.user.username,
                roles: s.user.roles || [],
            }));
            io.to(roomId).emit('userListUpdate', { roomId, users: usersInRoom });
        }
    };

    const fetchAndEmitHistory = async (socket, roomId) => {
      try {
        const historyResult = await db.query(
          `SELECT m.id, m.content, m.created_at, m.is_pinned, u.qft_uuid as author_qft_uuid, u.username, u.discord_id
           FROM chat_messages m
           JOIN users u ON m.author_qft_uuid = u.qft_uuid
           WHERE m.room_id = $1 AND m.deleted_at IS NULL
           ORDER BY m.is_pinned DESC, m.created_at ASC;`,
          [roomId]
        );
            
        const history = historyResult.rows.map(row => ({
          id: row.id,
          room_id: roomId,
          content: row.content,
          is_pinned: row.is_pinned,
          author: {
            qft_uuid: row.author_qft_uuid,
            username: row.username,
            discord_id: row.discord_id
          },
          created_at: row.created_at,
        }));
        console.log(`Server: Fetched history for room ${roomId}:`, history.length, 'messages');
        socket.emit('messageHistory', { roomId, messages: history });
      } catch (error) {
        console.error(`Error fetching history for room ${roomId}:`, error);
        socket.emit('error', { message: 'Failed to retrieve message history.' });
      }
    };

    socket.on('joinRoom', async (roomId) => {
      socket.join(roomId);
      socket.joinedRooms.add(roomId);

      if (redisClient) {
        await redisClient.sAdd(`room:${roomId}:users`, socket.qftUuid);
      }

      console.log(`${socket.user.username} joined room: ${roomId}`);
      broadcastUserList(roomId);
      await fetchAndEmitHistory(socket, roomId);
    });

    socket.on('joinDm', async ({ targetUserId }) => {
      if (!targetUserId) {
        return socket.emit('error', { message: 'Target user ID is required.' });
      }

      const members = [socket.qftUuid, targetUserId].sort();
      const roomId = `dm:${members[0]}:${members[1]}`;

      const targetUserResult = await db.query('SELECT * FROM users WHERE qft_uuid = $1', [targetUserId]);
      if (targetUserResult.rows.length === 0) {
        return socket.emit('error', { message: 'Target user not found.' });
      }

      socket.join(roomId);
      socket.joinedRooms.add(roomId);
      
      if (redisClient) {
        await redisClient.sAdd(`room:${roomId}:users`, socket.qftUuid);
        await redisClient.sAdd(`room:${roomId}:users`, targetUserId);
      }

      console.log(`${socket.user.username} initiated DM with room ID: ${roomId}`);
      
      socket.emit('dm-room-created', { roomId, targetUser: targetUserResult.rows[0] });

      broadcastUserList(roomId);
      await fetchAndEmitHistory(socket, roomId);
    });

    socket.on('leaveRoom', async (roomId) => {
      socket.leave(roomId);
      socket.joinedRooms.delete(roomId);

      if (redisClient) {
        await redisClient.sRem(`room:${roomId}:users`, socket.qftUuid);
      }
      
      console.log(`${socket.user.username} left room: ${roomId}`);
      broadcastUserList(roomId);
    });

    socket.on('chat message', async ({ roomId, content }) => {
      if (!roomId || !content) {
        return socket.emit('error', { message: 'Message content and room ID are required.' });
      }

      if (!checkPermission(socket.user, CHAT_ACTIONS.SEND_MESSAGE)) {
        return socket.emit('error', { message: 'You do not have permission to send messages.' });
      }

      try {
        const dbResult = await db.query(
          `INSERT INTO chat_messages (room_id, author_qft_uuid, content)
           VALUES ($1, $2, $3)
           RETURNING id, created_at, is_pinned;`,
          [socket.user.qft_uuid, content]
        );
        const newMessage = dbResult.rows[0];

        const messagePayload = {
          id: newMessage.id,
          room_id: roomId,
          content: content,
          is_pinned: newMessage.is_pinned,
          author: {
            qft_uuid: socket.user.qft_uuid,
            username: socket.user.username,
            discord_id: socket.user.discord_id
          },
          created_at: newMessage.created_at,
        };
        io.to(roomId).emit('chat message', messagePayload);

      } catch (error) {
        console.error(`Error handling message in room ${roomId}:`, error);
        socket.emit('error', { message: 'Failed to send message.' });
      }
    });

    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.user.username} (Socket ID: ${socket.id})`);

      if (redisClient) {
        await redisClient.del(`user:${socket.qftUuid}`);
        for (const roomId of socket.joinedRooms) {
          await redisClient.sRem(`room:${roomId}:users`, socket.qftUuid);
          broadcastUserList(roomId);
        }
      }
    });

    // ... other event handlers
  });
};

module.exports = initializeChat;