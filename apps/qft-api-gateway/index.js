// qft-api-gateway/index.js
console.log("🔥 Starting QFT API Gateway...");
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const db = require('./src/db');
// const { syncDatabaseProduction } = require('./src/db/migrations'); // Uncomment if needed
const authenticateToken = require('./src/middleware/auth');

const app = express();
const server = http.createServer(app);

// ✅ FIX 1: Ensure Port is interpreted as a number
const PORT = parseInt(process.env.PORT) || 3001;

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// --- Middleware Setup ---
const allowedOrigins = [
    'http://localhost:5173',
    'http://0.0.0.0:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL, 
    'https://qft-ecosystem-qft-app.vercel.app' // Explicitly added your Vercel URL
].filter(Boolean);

app.use(express.json()); 
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // Allow unknown origins temporarily for debugging if needed, otherwise block
            console.log("Blocked CORS origin:", origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// --- Socket.IO Setup ---
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Initialize Chat Service
const initializeChat = require('./src/services/chatService');
initializeChat(io);

// --- QFT Config ---
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI; 
const BOT_API_URL = process.env.BOT_API_URL;
const INTERNAL_BOT_SECRET = process.env.INTERNAL_BOT_SECRET;

// ✅ FIX 2: GOD MODE ADMIN LIST
// Reads a comma-separated list of IDs from Cloud Run (e.g. "123456,987654")
const MASTER_ADMIN_IDS = (process.env.MASTER_ADMIN_IDS || '').split(',');


// --- 1. DISCORD OAUTH CALLBACK ---
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
                scope: 'identify email guilds connections',
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

        // ✅ FIX 3: Force Admin Role for You
        let qftRole = 'level_0_standard'; 
        
        // Check if the logging-in user is in the Master Admin list
        if (MASTER_ADMIN_IDS.includes(discordUser.id)) {
            console.log(`👑 GOD MODE: Granting Alpha Owner access to ${discordUser.username}`);
            qftRole = 'alpha_owner'; 
        }

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
        
        const CLIENT_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
        console.log(`DEBUG: Redirecting to ${CLIENT_URL}`); 

        res.redirect(`${CLIENT_URL}/dashboard?token=QFT_IDENTITY_${qftUuid}`);

    } catch (error) {
        console.error('Discord Auth Error:', error);
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

        // ✅ FIX 4: Determine Ownership based on Role OR ID
        // Checks if role is 'alpha_owner' OR if ID is in the admin list
        const isOwner = userDetails.qft_role === 'alpha_owner' || MASTER_ADMIN_IDS.includes(userDetails.discord_id);

        let userClearanceLevel = userDetails.qft_role; // Default to stored role
        let userRoleName = userDetails.qft_role;
        let allUserRoles = [];
        
        // Fetch roles from user_roles table
        const rolesRes = await db.query(
            `SELECT r.clearance_level, r.name
             FROM user_roles ur
             JOIN roles r ON ur.role_id = r.id
             WHERE ur.user_discord_id = $1`,
            [userDetails.discord_id]
        );

        if (rolesRes.rows.length > 0) {
            userClearanceLevel = rolesRes.rows[0].clearance_level;
            userRoleName = rolesRes.rows[0].name;
            allUserRoles = rolesRes.rows.map(r => r.name);
        }

        res.json({
            qft_uuid: qft_uuid,
            discord_id: userDetails.discord_id,
            is_owner: isOwner,
            permissions: isOwner ? ['read', 'write', 'admin'] : ['read'],
            discord_client_id: DISCORD_CLIENT_ID,
            username: userDetails.username,
            public_flags: userDetails.public_flags,
            avatar: userDetails.avatar,
            email: userDetails.email,
            qft_role: userClearanceLevel,
            role_name: userRoleName,
            all_roles: allUserRoles,
            connections: userDetails.connections
        });
    } catch (error) {
        console.error('Error fetching user status from database:', error);
        res.status(500).json({ message: 'Failed to retrieve user status.' });
    }
});

// ... (KEEP ALL YOUR OTHER ROUTES HERE: Mutual Guilds, Channels, Posts, Admin, etc.) ...
// Paste the rest of your routes (lines 200+) here.

// --- Route Imports (Keep your existing imports) ---
const internalRoutes = require('./src/routes/internal');
app.use('/api/internal', internalRoutes);

// Mounting registry routes earlier to avoid potential conflicts
try {
    const registryRoutes = require('./src/routes/registry');
    app.use('/api/v1/registry', registryRoutes);
} catch (err) { console.error('Route Error: Failed to mount registry routes:', err.message); }

try {
    const productionRoutes = require('./src/routes/production');
    app.use('/api/v1', productionRoutes);
} catch (err) { console.error('Route Error:', err.message); }

try {
    const discordRoutes = require('./src/routes/discord');
    app.use('/api/v1/discord', discordRoutes);
} catch (err) { console.error('Route Error:', err.message); }

const adminRoutes = require('./src/routes/admin');
app.use('/api/v1/admin', adminRoutes);

// ... (Keep other route imports) ...

// ✅ FIX 5: CRITICAL - SERVER LISTEN
// This binds the server to the Cloud Run port and 0.0.0.0
// We use 'server.listen' instead of 'app.listen' because of Socket.io
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ QFT API Gateway running on port ${PORT}`);
    console.log(`✅ Environment: ${process.env.NODE_ENV}`);
});