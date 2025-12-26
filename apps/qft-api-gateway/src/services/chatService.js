// apps/qft-api-gateway/src/services/chatService.js
const db = require('../db');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const { checkPermission, CHAT_ACTIONS } = require('../utils/chatPermissions');

// Redis client for distributed chat state
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect().then(() => console.log('✅ Redis client connected')).catch(console.error);

const initializeChat = (io) => {
  // Configure Socket.IO to use the Redis adapter
  io.adapter(createAdapter(redisClient, redisClient.duplicate()));

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

      // Store user's details in Redis Hash for quick lookup by qftUuid
      await redisClient.hSet(`user:${socket.qftUuid}`, {
        qft_uuid: socket.user.qft_uuid,
        discord_id: socket.user.discord_id,
        username: socket.user.username,
        roles: JSON.stringify(socket.user.roles || []), // Store roles as JSON string
      });

      console.log('Socket Auth: User authenticated and data stored in Redis:', socket.user.username);
      next();
    } catch (err) {
      console.error('Socket auth middleware error:', err);
      return next(new Error('Authentication error: Server error.'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.username} (Socket ID: ${socket.id})`);

    const broadcastUserList = async (roomId) => {
      const userQftUuidsInRoom = await redisClient.sMembers(`room:${roomId}:users`);
      const usersInRoom = [];

      for (const qftUuid of userQftUuidsInRoom) {
        const userData = await redisClient.hGetAll(`user:${qftUuid}`);
        if (Object.keys(userData).length > 0) {
          // Parse roles back from JSON string
          if (userData.roles) {
            try {
              userData.roles = JSON.parse(userData.roles);
            } catch (e) {
              console.error(`Error parsing roles for user ${qftUuid}:`, e);
              userData.roles = []; // Default to empty array on error
            }
          } else {
            userData.roles = [];
          }
          usersInRoom.push(userData);
        }
      }

      io.to(roomId).emit('userListUpdate', { roomId, users: usersInRoom });
      console.log(`Broadcasting user list for room ${roomId}:`, usersInRoom.map(u => u.username));
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

      // Add user's qft_uuid to the Redis Set for this room
      await redisClient.sAdd(`room:${roomId}:users`, socket.qftUuid);

      console.log(`${socket.user.username} joined room: ${roomId}`);
      broadcastUserList(roomId); // This will now fetch from Redis
      await fetchAndEmitHistory(socket, roomId);
    });

    socket.on('joinDm', async ({ targetUserId }) => {
      if (!targetUserId) {
        return socket.emit('error', { message: 'Target user ID is required.' });
      }

      const members = [socket.qftUuid, targetUserId].sort(); // Use socket.qftUuid
      const roomId = `dm:${members[0]}:${members[1]}`;

      const targetUserResult = await db.query('SELECT * FROM users WHERE qft_uuid = $1', [targetUserId]);
      if (targetUserResult.rows.length === 0) {
        return socket.emit('error', { message: 'Target user not found.' });
      }

      socket.join(roomId);
      socket.joinedRooms.add(roomId);
      
      // Add both users' qft_uuids to the Redis Set for this DM room
      await redisClient.sAdd(`room:${roomId}:users`, socket.qftUuid);
      await redisClient.sAdd(`room:${roomId}:users`, targetUserId);

      console.log(`${socket.user.username} initiated DM with room ID: ${roomId}`);
      
      // Let the client know the DM room is ready
      socket.emit('dm-room-created', { roomId, targetUser: targetUserResult.rows[0] });

      broadcastUserList(roomId); // Broadcast user list for DM room
      await fetchAndEmitHistory(socket, roomId);
    });

    socket.on('leaveRoom', async (roomId) => {
      socket.leave(roomId);
      socket.joinedRooms.delete(roomId);

      // Remove user's qft_uuid from the Redis Set for this room
      await redisClient.sRem(`room:${roomId}:users`, socket.qftUuid);
      
      console.log(`${socket.user.username} left room: ${roomId}`);
      broadcastUserList(roomId); // This will now fetch from Redis
    });

    socket.on('chat message', async ({ roomId, content }) => {
      if (!roomId || !content) {
        return socket.emit('error', { message: 'Message content and room ID are required.' });
      }

      if (!checkPermission(socket.user, CHAT_ACTIONS.SEND_MESSAGE)) {
        return socket.emit('error', { message: 'You do not have permission to send messages.' });
      }

      try {
        // 1. Save message to database
        const dbResult = await db.query(
          `INSERT INTO chat_messages (room_id, author_qft_uuid, content)
           VALUES ($1, $2, $3)
           RETURNING id, created_at, is_pinned;`,
          [roomId, socket.user.qft_uuid, content]
        );
        const newMessage = dbResult.rows[0];

        // 2. Create message payload to broadcast
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
        console.log(`Server: Broadcasting new message to room ${roomId}:`, messagePayload);
        // 3. Broadcast message to the room
        io.to(roomId).emit('chat message', messagePayload);

      } catch (error) {
        console.error(`Error handling message in room ${roomId}:`, error);
        socket.emit('error', { message: 'Failed to send message.' });
      }
    });

    socket.on('deleteMessage', async ({ messageId }) => {
      if (!messageId) {
        return socket.emit('error', { message: 'Message ID is required.' });
      }
    
      try {
        // 1. Fetch the message to check for authorship and room_id
        const msgResult = await db.query(
          'SELECT author_qft_uuid, room_id FROM chat_messages WHERE id = $1',
          [messageId]
        );
    
        if (msgResult.rows.length === 0) {
          return socket.emit('error', { message: 'Message not found.' });
        }
    
        const message = msgResult.rows[0];
        const isAuthor = message.author_qft_uuid === socket.user.qft_uuid;
    
        // 2. Authorize the deletion
        const canDelete = (isAuthor && checkPermission(socket.user, CHAT_ACTIONS.DELETE_OWN_MESSAGE)) ||
                          (!isAuthor && checkPermission(socket.user, CHAT_ACTIONS.DELETE_ANY_MESSAGE));

        if (!canDelete) {
          return socket.emit('error', { message: 'You are not authorized to delete this message.' });
        }
    
        // 3. Soft-delete the message from the database
        await db.query('UPDATE chat_messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [messageId]);
    
        // 4. Broadcast the deletion to the room
        io.to(message.room_id).emit('messageDeleted', { messageId, roomId: message.room_id });
        console.log(`Message ${messageId} deleted by ${socket.user.username}`);
    
      } catch (error) {
        console.error(`Error deleting message ${messageId}:`, error);
        socket.emit('error', { message: 'Failed to delete message.' });
      }
    });

    socket.on('message.edit', async ({ messageId, newContent }) => {
        if (!messageId || !newContent) {
            return socket.emit('error', { message: 'Message ID and new content are required for editing.' });
        }

        try {
            // 1. Fetch the message
            const msgResult = await db.query(
                'SELECT author_qft_uuid, room_id, content FROM chat_messages WHERE id = $1',
                [messageId]
            );

            if (msgResult.rows.length === 0) {
                return socket.emit('error', { message: 'Message not found.' });
            }

            const message = msgResult.rows[0];
            const isAuthor = message.author_qft_uuid === socket.user.qft_uuid;

            // 2. Validate permissions
            const canEdit = (isAuthor && checkPermission(socket.user, CHAT_ACTIONS.EDIT_OWN_MESSAGE)) ||
                            (!isAuthor && checkPermission(socket.user, CHAT_ACTIONS.EDIT_ANY_MESSAGE));

            if (!canEdit) {
                return socket.emit('error', { message: 'You are not authorized to edit this message.' });
            }

            // 3. Update message in DB
            const updateResult = await db.query(
                'UPDATE chat_messages SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING updated_at',
                [newContent, messageId]
            );
            const updatedAt = updateResult.rows[0].updated_at;

            // 4. Broadcast 'messageEdited' event
            io.to(message.room_id).emit('messageEdited', {
                messageId,
                roomId: message.room_id,
                newContent,
                updatedAt,
            });

        } catch (error) {
            console.error(`Error editing message ${messageId}:`, error);
            socket.emit('error', { message: 'Failed to edit message.' });
        }
    });

    socket.on('message.pin', async ({ messageId, roomId }) => {
        if (!messageId || !roomId) {
            return socket.emit('error', { message: 'Message ID and Room ID are required to pin a message.' });
        }

        if (!checkPermission(socket.user, CHAT_ACTIONS.PIN_MESSAGE)) {
            return socket.emit('error', { message: 'You are not authorized to pin messages.' });
        }

        try {
            // Check if message exists and belongs to the room
            const msgResult = await db.query(
                'SELECT id FROM chat_messages WHERE id = $1 AND room_id = $2',
                [messageId, roomId]
            );

            if (msgResult.rows.length === 0) {
                return socket.emit('error', { message: 'Message not found in this room.' });
            }

            await db.query(
                'UPDATE chat_messages SET is_pinned = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                [messageId]
            );

            io.to(roomId).emit('messagePinned', { messageId, roomId });
        } catch (error) {
            console.error(`Error pinning message ${messageId} in room ${roomId}:`, error);
            socket.emit('error', { message: 'Failed to pin message.' });
        }
    });

    socket.on('message.unpin', async ({ messageId, roomId }) => {
        if (!messageId || !roomId) {
            return socket.emit('error', { message: 'Message ID and Room ID are required to unpin a message.' });
        }

        if (!checkPermission(socket.user, CHAT_ACTIONS.PIN_MESSAGE)) {
            return socket.emit('error', { message: 'You are not authorized to unpin messages.' });
        }

        try {
            // Check if message exists and belongs to the room
            const msgResult = await db.query(
                'SELECT id FROM chat_messages WHERE id = $1 AND room_id = $2',
                [messageId, roomId]
            );

            if (msgResult.rows.length === 0) {
                return socket.emit('error', { message: 'Message not found in this room.' });
            }
            
            await db.query(
                'UPDATE chat_messages SET is_pinned = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                [messageId]
            );

            io.to(roomId).emit('messageUnpinned', { messageId, roomId });
        } catch (error) {
            console.error(`Error unpinning message ${messageId} in room ${roomId}:`, error);
            socket.emit('error', { message: 'Failed to unpin message.' });
        }
    });

    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.user.username} (Socket ID: ${socket.id})`);

      // Remove user's details from Redis Hash
      await redisClient.del(`user:${socket.qftUuid}`);

      // Remove user from all room sets they were part of
      for (const roomId of socket.joinedRooms) {
        await redisClient.sRem(`room:${roomId}:users`, socket.qftUuid);
        // We still need to broadcast user list updates for all affected rooms
        // to ensure other clients see the user leave.
        // This will be handled by the updated broadcastUserList.
        broadcastUserList(roomId);
      }
    });

    // TODO: Implement further event listeners for messages, etc.
  });
};

module.exports = initializeChat;