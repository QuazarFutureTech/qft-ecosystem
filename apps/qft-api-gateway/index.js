// qft-api-gateway/index.js
console.log("🔥 Starting QFT API Gateway...");
console.log("🔥 PORT:", process.env.PORT);
console.log("🔥 NODE_ENV:", process.env.NODE_ENV);
console.log("🔥 Starting DB sync...");

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./src/db');
const { syncDatabaseProduction } = require('./src/db/migrations');
const authenticateToken = require('./src/middleware/auth');
const app = express();
const PORT = process.env.PORT || 3001;

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit - just log it
});

// --- Middleware Setup ---
const allowedOrigins = [
  'http://localhost:5173', 
  process.env.FRONTEND_URL // We will set this in Cloud Run later
];
app.use(express.json()); // Body parser
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      // If the origin isn't in the list, allow it anyway ONLY if we haven't set a production URL yet
      if (!process.env.FRONTEND_URL) return callback(null, true);
      
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true // Crucial for passing cookies/headers if needed
}));



// --- QFT Config ---
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI; 
const BOT_API_URL = process.env.BOT_API_URL;
const INTERNAL_BOT_SECRET = process.env.INTERNAL_BOT_SECRET;
const QFT_OWNER_DISCORD_ID = process.env.QFT_OWNER_DISCORD_ID;

// HARDCODED OWNER UUID (REPLACE THIS!)
const QFT_OWNER_UUID = 'cfa01e88-03f2-43ef-9112-11816a7e72a6'; 


// --- 1. DISCORD OAUTH CALLBACK (Unprotected) ---
app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: DISCORD_REDIRECT_URI,
                scope: 'identify email guilds connections', // Added 'connections' scope
            }).toString(),
        });

        const tokens = await tokenResponse.json();
        
        // Get user details
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const discordUser = await userResponse.json();

        // Get user connections
        const connectionsResponse = await fetch('https://discord.com/api/users/@me/connections', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const discordConnections = await connectionsResponse.json();

        // Determine QFT role
        const qftRole = (discordUser.id === QFT_OWNER_DISCORD_ID) ? 'alpha_owner' : 'level_0_standard';

        // Use global_name if available, otherwise fallback to username
        const primaryUsername = discordUser.global_name || discordUser.username;
        
        // Save/Update user in database
        const result = await db.query(
            `INSERT INTO users (discord_id, username, email, public_flags, avatar, qft_role, discord_access_token, discord_refresh_token, connections)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (discord_id)
             DO UPDATE SET
                username = $2, email = $3, public_flags = $4, avatar = $5, qft_role = $6, discord_access_token = $7, discord_refresh_token = $8, connections = $9, updated_at = CURRENT_TIMESTAMP
             RETURNING qft_uuid;`,
            [discordUser.id, primaryUsername, discordUser.email, discordUser.public_flags, discordUser.avatar, qftRole, tokens.access_token, tokens.refresh_token, JSON.stringify(discordConnections)]
        );
        const qftUuid = result.rows[0].qft_uuid;
        
        // ✅ DYNAMIC URL:
        // Reads the 'FRONTEND_URL' from Cloud Run settings.
        // If missing (like on your PC), defaults to localhost.
        const CLIENT_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

        console.log(`DEBUG: Redirecting to ${CLIENT_URL}`); // Helpful for logs

        // Final Redirect using the dynamic variable
        res.redirect(`${CLIENT_URL}/dashboard?token=QFT_IDENTITY_${qftUuid}`);

    } catch (error) {
        console.error('Discord Auth Error:', error);
        
        // Also fix the error redirect!
        const CLIENT_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${CLIENT_URL}/?error=auth_failed`);
    }
});


// --- 2. PROTECTED ROUTE: Get User Permissions ---
app.get('/api/v1/user/status', authenticateToken, async (req, res) => {
    const { qft_uuid } = req.user;

    try {
        const userDetailsRes = await db.query(
            `SELECT discord_id, username, email, public_flags, avatar, qft_role, connections
             FROM users
             WHERE qft_uuid = $1`,
            [qft_uuid]
        );

        if (userDetailsRes.rows.length === 0) {
            return res.status(404).json({ message: 'User details not found.' });
        }

        const userDetails = userDetailsRes.rows[0];
        const isOwner = qft_uuid === QFT_OWNER_UUID;

        // 🔥 NEW: Get user's highest role and all roles from roles system
        let userClearanceLevel = null;
        let userRoleName = null;
        let allUserRoles = [];
        const rolesRes = await db.query(
            `SELECT r.clearance_level, r.name
             FROM user_roles ur
             JOIN roles r ON ur.role_id = r.id
             WHERE ur.user_discord_id = $1
             ORDER BY 
               CASE r.clearance_level
                 WHEN 'α' THEN 1
                 WHEN 'Ω' THEN 2
                 WHEN '3' THEN 3
                 WHEN '2' THEN 4
                 WHEN '1' THEN 5
                 WHEN '0' THEN 6
                 ELSE 7
               END`,
            [userDetails.discord_id]
        );

        if (rolesRes.rows.length > 0) {
            userClearanceLevel = rolesRes.rows[0].clearance_level;
            userRoleName = rolesRes.rows[0].name;
            allUserRoles = rolesRes.rows.map(r => r.name);
        }

        res.json({
            qft_uuid: qft_uuid,
            discord_id: userDetails.discord_id, // Include discord_id here
            is_owner: isOwner,
            permissions: isOwner ? ['read', 'write', 'admin'] : ['read'],
            discord_client_id: DISCORD_CLIENT_ID, // Corrected: Use environment variable
            username: userDetails.username,
            public_flags: userDetails.public_flags,
            avatar: userDetails.avatar,
            email: userDetails.email,
            qft_role: userClearanceLevel, // Return clearance level
            role_name: userRoleName, // Return primary role name
            all_roles: allUserRoles, // Return all role names
            connections: userDetails.connections // Include connections
        });
    } catch (error) {
        console.error('Error fetching user status from database:', error);
        res.status(500).json({ message: 'Failed to retrieve user status.' });
    }
});

// --- 3. PROTECTED ROUTE: Get Mutual Guilds from Bot ---
app.get('/api/v1/user/guilds', authenticateToken, async (req, res) => {
    const { qft_uuid } = req.user;

    try {
        // Look up the Discord ID associated with the QFT UUID
        const userRes = await db.query('SELECT discord_id FROM users WHERE qft_uuid = $1', [qft_uuid]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const discordId = userRes.rows[0].discord_id;
        
        // Call the Bot's local API (http://localhost:3002)
        const botResponse = await fetch(`${BOT_API_URL}/api/guilds/${discordId}`, {
            headers: { 
                'Internal-Secret': INTERNAL_BOT_SECRET 
            },
        });

        if (!botResponse.ok) {
            throw new Error(`Bot API failed with status ${botResponse.status}`);
        }

        const guilds = await botResponse.json();
        res.json(guilds);

    } catch (error) {
        console.error('Error fetching guilds from bot:', error);
        res.status(500).json({ message: 'Failed to retrieve server data.' });
    }
});

// PROTECTED ROUTE: Get Channels for a specific Guild from Bot
app.get('/api/v1/user/guilds/:guildId/channels', authenticateToken, async (req, res) => {
    const { qft_uuid } = req.user;
    const { guildId } = req.params;

    try {
        // Look up the Discord ID and access token associated with the QFT UUID
        const userRes = await db.query('SELECT discord_id, discord_access_token FROM users WHERE qft_uuid = $1', [qft_uuid]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const { discord_id, discord_access_token } = userRes.rows[0];

        // Call the Bot's local API to get channels
        const botResponse = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/channels`, {
            headers: {
                'Internal-Secret': INTERNAL_BOT_SECRET,
                // Potentially pass user's discord_access_token if bot needs to make requests on behalf of user
                'Discord-Access-Token': discord_access_token 
            },
        });

        if (!botResponse.ok) {
            // Forward the error message from the bot
            const errorData = await botResponse.json();
            return res.status(botResponse.status).json(errorData);
        }

        const channels = await botResponse.json();
        res.json(channels);

    } catch (error) {
        console.error(`Error fetching channels for guild ${guildId} from bot:`, error);
        res.status(500).json({ message: 'Failed to retrieve channel data.' });
    }
});

app.delete('/api/v1/guilds/:guildId', authenticateToken, async (req, res) => {
    const guildId = req.params.guildId;

    try {
        // Call the Bot's local API (http://localhost:3002) using DELETE method
        const botResponse = await fetch(`${BOT_API_URL}/api/guilds/${guildId}`, {
            method: 'DELETE', // <-- CRUCIAL: Use DELETE
            headers: { 
                'Internal-Secret': INTERNAL_BOT_SECRET // Internal security
            },
        });

        const data = await botResponse.json();

        if (!botResponse.ok) {
            // Forward the error message from the bot (e.g., 404 Bot not in guild)
            return res.status(botResponse.status).json(data);
        }

        res.json(data);

    } catch (error) {
        console.error('Error in API Gateway trying to kick bot:', error);
        res.status(500).json({ message: 'Failed to process bot kick request.' });
    }
});

// PROTECTED ROUTE: Create a new post for the feed
app.post('/api/v1/feed/posts', authenticateToken, async (req, res) => {
    const { qft_uuid } = req.user;
    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).json({ message: 'Post title and content are required.' });
    }

    try {
        const result = await db.query(
            `INSERT INTO posts (title, content, author_qft_uuid)
             VALUES ($1, $2, $3)
             RETURNING id, title, content, author_qft_uuid, created_at;`,
            [title, content, qft_uuid]
        );

        res.status(201).json(result.rows[0]); // Return the newly created post
    } catch (error) {
        console.error('Error creating new post:', error);
        res.status(500).json({ message: 'Failed to create post.' });
    }
});

// PROTECTED ROUTE: Get all posts for the feed
app.get('/api/v1/feed/posts', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT 
                p.id, 
                p.title, 
                p.content, 
                p.created_at, 
                u.username AS author,
                u.qft_uuid AS author_qft_uuid
             FROM posts p
             LEFT JOIN users u ON p.author_qft_uuid = u.qft_uuid
             ORDER BY p.created_at DESC;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Failed to retrieve posts.' });
    }
});

// PROTECTED ROUTE: Update a member's role in a Discord guild
app.put('/api/v1/admin/guilds/:guildId/members/:userId/roles', authenticateToken, async (req, res) => {
    const { qft_uuid } = req.user;
    const { guildId, userId } = req.params;
    const { roleId, roleName } = req.body;

    // Check if the authenticated user is the QFT_OWNER_UUID
    if (qft_uuid !== QFT_OWNER_UUID) {
        return res.status(403).json({ message: 'Access denied: Only the owner can manage roles.' });
    }

    if (!roleId && !roleName) {
        return res.status(400).json({ message: 'Either roleId or roleName must be provided.' });
    }

    try {
        // Look up the Discord ID and access token associated with the QFT UUID (though bot uses its own permissions)
        const userRes = await db.query('SELECT discord_id, discord_access_token FROM users WHERE qft_uuid = $1', [qft_uuid]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        // const { discord_id, discord_access_token } = userRes.rows[0]; // Not strictly needed for bot's role changes

        // Call the Bot's local API to update the member's role
        const botResponse = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/members/${userId}/roles`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Internal-Secret': INTERNAL_BOT_SECRET,
            },
            body: JSON.stringify({ roleId, roleName })
        });

        if (!botResponse.ok) {
            const errorData = await botResponse.json();
            return res.status(botResponse.status).json(errorData);
        }

        const data = await botResponse.json();
        res.json(data);

    } catch (error) {
        console.error(`Error updating role for user ${userId} in guild ${guildId}:`, error);
        res.status(500).json({ message: 'Failed to update member role.' });
    }
});

// PROTECTED ROUTE: Get roles for a specific Discord guild
app.get('/api/v1/admin/guilds/:guildId/roles', authenticateToken, async (req, res) => {
    const { qft_uuid } = req.user;
    const { guildId } = req.params;

    // Check if the authenticated user is the QFT_OWNER_UUID
    if (qft_uuid !== QFT_OWNER_UUID) {
        return res.status(403).json({ message: 'Access denied: Only the owner can manage roles.' });
    }

    try {
        // Call the Bot's local API to get roles
        const botResponse = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/roles`, {
            headers: {
                'Internal-Secret': INTERNAL_BOT_SECRET,
            },
        });

        if (!botResponse.ok) {
            const errorData = await botResponse.json();
            return res.status(botResponse.status).json(errorData);
        }

        const roles = await botResponse.json();
        res.json(roles);

    } catch (error) {
        console.error(`Error fetching roles for guild ${guildId} from bot:`, error);
        res.status(500).json({ message: 'Failed to retrieve roles.' });
    }
});

// PROTECTED ROUTE: Post an embed to a Discord channel via Bot
app.post('/api/v1/guilds/:guildId/channels/:channelId/embed', authenticateToken, async (req, res) => {
    const { guildId, channelId } = req.params;
    try {
        const botResponse = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/channels/${channelId}/embed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Internal-Secret': INTERNAL_BOT_SECRET,
            },
            body: JSON.stringify(req.body || {}),
        });

        const data = await botResponse.json();
        return res.status(botResponse.status).json(data);
    } catch (error) {
        console.error('Error posting embed via API Gateway:', error);
        res.status(500).json({ success: false, message: 'Failed to post embed.' });
    }
});

// PROTECTED ROUTE: Get scheduled embeds for a guild
app.get('/api/v1/guilds/:guildId/scheduled-embeds', authenticateToken, async (req, res) => {
    const { guildId } = req.params;
    try {
        const botResponse = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/scheduled-embeds`, {
            headers: { 'Internal-Secret': INTERNAL_BOT_SECRET },
        });
        const data = await botResponse.json();
        return res.status(botResponse.status).json(data);
    } catch (error) {
        console.error('Error fetching scheduled embeds:', error);
        res.status(500).json({ jobs: [], message: 'Failed to fetch scheduled embeds.' });
    }
});

// PROTECTED ROUTE: Remove a scheduled embed
app.delete('/api/v1/guilds/:guildId/scheduled-embeds/:jobId', authenticateToken, async (req, res) => {
    const { guildId, jobId } = req.params;
    try {
        const botResponse = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/scheduled-embeds/${jobId}`, {
            method: 'DELETE',
            headers: { 'Internal-Secret': INTERNAL_BOT_SECRET },
        });
        const data = await botResponse.json();
        return res.status(botResponse.status).json(data);
    } catch (error) {
        console.error('Error removing scheduled embed:', error);
        res.status(500).json({ success: false, message: 'Failed to remove scheduled embed.' });
    }
});

// PROTECTED ROUTE: Get custom commands for a guild
app.get('/api/v1/guilds/:guildId/custom-commands', authenticateToken, async (req, res) => {
    const { guildId } = req.params;
    try {
        const botResponse = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/custom-commands`, {
            headers: { 'Internal-Secret': INTERNAL_BOT_SECRET },
        });
        const data = await botResponse.json();
        return res.status(botResponse.status).json(data);
    } catch (error) {
        console.error('Error fetching custom commands:', error);
        res.status(500).json({ success: false, commands: {}, message: 'Failed to fetch custom commands.' });
    }
});

// PROTECTED ROUTE: Create/update custom command
app.post('/api/v1/guilds/:guildId/custom-commands', authenticateToken, async (req, res) => {
    const { guildId } = req.params;
    try {
        const botResponse = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/custom-commands`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Internal-Secret': INTERNAL_BOT_SECRET,
            },
            body: JSON.stringify(req.body),
        });
        const data = await botResponse.json();
        return res.status(botResponse.status).json(data);
    } catch (error) {
        console.error('Error saving custom command:', error);
        res.status(500).json({ success: false, message: 'Failed to save custom command.' });
    }
});

// PROTECTED ROUTE: Delete custom command
app.delete('/api/v1/guilds/:guildId/custom-commands/:name', authenticateToken, async (req, res) => {
    const { guildId, name } = req.params;
    try {
        const botResponse = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/custom-commands/${encodeURIComponent(name)}`, {
            method: 'DELETE',
            headers: { 'Internal-Secret': INTERNAL_BOT_SECRET },
        });
        const data = await botResponse.json();
        return res.status(botResponse.status).json(data);
    } catch (error) {
        console.error('Error deleting custom command:', error);
        res.status(500).json({ success: false, message: 'Failed to delete custom command.' });
    }
});

// PROTECTED ROUTE: Moderation action (ban, kick, timeout)
app.post('/api/v1/guilds/:guildId/members/:userId/:action', authenticateToken, async (req, res) => {
    const { guildId, userId, action } = req.params;
    try {
        const botResponse = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/members/${userId}/${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Internal-Secret': INTERNAL_BOT_SECRET,
            },
            body: JSON.stringify(req.body),
        });
        const data = await botResponse.json();
        return res.status(botResponse.status).json(data);
    } catch (error) {
        console.error(`Error performing ${action}:`, error);
        res.status(500).json({ success: false, message: `Failed to ${action} user.` });
    }
});

// PROTECTED ROUTE: Set Discord Rich Presence via Bot
app.post('/api/v1/discord/rpc', authenticateToken, async (req, res) => {
    // This endpoint allows the frontend to send RPC updates to the bot.
    // The bot will then update its presence on Discord.
    const { activity } = req.body;

    if (!activity) {
        return res.status(400).json({ message: 'Activity object is required for RPC update.' });
    }

    try {
        const botResponse = await fetch(`${BOT_API_URL}/api/set-rpc-activity`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Internal-Secret': INTERNAL_BOT_SECRET,
            },
            body: JSON.stringify({ activity }),
        });

        if (!botResponse.ok) {
            const errorData = await botResponse.json();
            console.error('Error forwarding RPC to bot:', errorData);
            return res.status(botResponse.status).json(errorData);
        }

        const data = await botResponse.json();
        res.json(data);

    } catch (error) {
        console.error('Error setting Discord RPC via API Gateway:', error);
        res.status(500).json({ message: 'Failed to set Discord Rich Presence.' });
    }
});

// --- Internal Routes (Bot Communication) ---
const internalRoutes = require('./src/routes/internal');
app.use('/api/internal', internalRoutes);

// --- Production Routes ---
try {
    const productionRoutes = require('./src/routes/production');
    app.use('/api/v1', productionRoutes);
    console.log('✅ Production routes loaded');
} catch (err) {
    console.error('❌ Failed to load production routes:', err);
    process.exit(1);
}

// --- Discord Data Routes ---
try {
    const discordRoutes = require('./src/routes/discord');
    app.use('/api/v1/discord', discordRoutes);
    console.log('✅ Discord data routes loaded');
} catch (err) {
    console.error('❌ Failed to load discord routes:', err.message);
}

// --- Admin Routes ---
const adminRoutes = require('./src/routes/admin');
app.use('/api/v1/admin', adminRoutes);

// --- Permissions Routes ---
try {
    const permissionsRoutes = require('./src/routes/permissions');
    app.use('/api/v1/permissions', permissionsRoutes);
    console.log('✅ Permissions routes loaded');
} catch (err) {
    console.error('❌ Failed to load permissions routes:', err.message);
}

// --- Registry Routes ---
try {
    const registryRoutes = require('./src/routes/registry');
    app.use('/api/v1/registry', registryRoutes);
    console.log('✅ Registry routes loaded');
} catch (err) {
    console.error('❌ Failed to load registry routes:', err.message);
}

// --- Activity Logs Routes ---
try {
    const activityLogsRoutes = require('./src/routes/activityLogs');
    app.use('/api/v1/activity-logs', activityLogsRoutes);
    console.log('✅ Activity logs routes loaded');
} catch (err) {
    console.error('❌ Failed to load activity logs routes:', err.message);
}

// --- Moderation Routes ---
try {
    const moderationRoutes = require('./src/routes/moderation');
    app.use('/api/v1/moderation', moderationRoutes);
    console.log('✅ Moderation routes loaded');
} catch (err) {
    console.error('❌ Failed to load moderation routes:', err.message);
}
// ... (Keep all your routes above) ...

// --- FAIL-SAFE SERVER STARTUP ---
// 1. Start listening IMMEDIATELY so Cloud Run knows we are alive.
//    Crucial: Listen on '0.0.0.0' for Docker/Cloud Run binding.
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 QFT API Gateway LISTENING on port ${PORT}`);
    console.log(`⏳ Waiting for Database Connection...`);
});

// 2. Attempt Database Connection in the background
db.syncDatabase()
    .then(() => syncDatabaseProduction())
    .then(() => {
        console.log('✅ Database Synced & Ready');
        
        // Start the command scheduler only after DB is ready
        try {
            const schedulerService = require('./src/services/schedulerService');
            schedulerService.start();
            console.log('✅ Scheduler Started');
        } catch (e) {
            console.error('⚠️ Scheduler failed to start:', e.message);
        }
    })
    .catch(err => {
        console.error('❌ CRITICAL DB ERROR:', err.message);
        console.error('⚠️ Server is running, but DB features will fail.');
        // Do NOT process.exit(1) here. Let the server stay alive 
        // so you can read these error logs in the Cloud Console!
    });