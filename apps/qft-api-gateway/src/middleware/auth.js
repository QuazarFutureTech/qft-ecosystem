// qft-api-gateway/src/middleware/auth.js

const db = require('../db');

// This middleware checks for a token and extracts the user's UUID.
const authenticateToken = async (req, res, next) => {
    // 1. Get the token from the Authorization header (standard practice)
    const authHeader = req.headers['authorization'];
    // Format is typically: Authorization: Bearer <TOKEN>
    const token = authHeader && authHeader.split(' ')[1]; 

    if (token == null) {
        // No token provided (401 Unauthorized)
        return res.status(401).send({ message: 'Authentication required.' });
    }

    // Since we are using a placeholder token (QFT_IDENTITY_UUID...), 
    // we skip full JWT verification for now.
    if (!token.startsWith('QFT_IDENTITY_')) {
        return res.status(403).send({ message: 'Invalid token format.' });
    }

    // Extract the UUID from the token placeholder
    const qftUuid = token.replace('QFT_IDENTITY_', '');

    try {
        // Fetch user details from DB to populate req.user with discord_id, username, and role
        const userResult = await db.query(
            'SELECT qft_uuid, discord_id, qft_role, username FROM users WHERE qft_uuid = $1', 
            [qftUuid]
        );
        
        if (userResult.rows.length > 0) {
            req.user = {
                ...userResult.rows[0],
                username: userResult.rows[0].username || 'Unknown User'
            };
        } else {
             // Fallback if user not found (shouldn't happen with valid token)
             req.user = { qft_uuid: qftUuid, username: 'Unknown User' };
        }
    } catch (err) {
        console.error('Auth Middleware Error:', err);
        // Fallback
        req.user = { qft_uuid: qftUuid, username: 'Unknown User' };
    }

    // propagate internal secret header to bot API calls
    const AUTHORIZED_INTERNAL = process.env.INTERNAL_BOT_SECRET || 'dev_secret';
    req.internalSecret = AUTHORIZED_INTERNAL;
    
    next(); // Move to the next function (the route handler)
};

module.exports = authenticateToken;