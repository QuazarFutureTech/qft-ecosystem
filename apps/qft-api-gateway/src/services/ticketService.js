// qft-api-gateway/src/services/ticketService.js
// Ticket system with Discord thread integration and transcript logging

const { Pool } = require('pg');
// Native fetch is available in Node 18+

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3002';
const INTERNAL_SECRET = process.env.INTERNAL_BOT_SECRET;

// Create a new ticket
const createTicket = async (guildId, userDiscordId, title, description, ticketChannelId) => {
  const query = `
    SELECT COALESCE(MAX(ticket_number), 0) + 1 as next_number
    FROM tickets WHERE guild_id = $1;
  `;
  const result = await pool.query(query, [guildId]);
  const ticketNumber = result.rows[0].next_number;

  const ticketInsert = `
    INSERT INTO tickets (guild_id, user_discord_id, ticket_number, title, description, status)
    VALUES ($1, $2, $3, $4, $5, 'open')
    RETURNING *;
  `;
  const ticketResult = await pool.query(ticketInsert, [guildId, userDiscordId, ticketNumber, title, description]);
  const ticket = ticketResult.rows[0];

  // Call Agent to create Discord thread
  try {
    const agentRes = await fetch(`${BOT_API_URL}/api/internal/tickets/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Internal-Secret': INTERNAL_SECRET
        },
        body: JSON.stringify({
            guildId,
            channelId: ticketChannelId,
            userId: userDiscordId,
            title,
            description,
            ticketNumber
        })
    });

    if (!agentRes.ok) {
        const err = await agentRes.json();
        throw new Error(err.message || 'Agent failed to create thread');
    }

    const agentData = await agentRes.json();
    const threadId = agentData.threadId;

    // Update ticket with thread ID
    const updateQuery = `
      UPDATE tickets SET thread_id = $1 WHERE id = $2 RETURNING *;
    `;
    const updated = await pool.query(updateQuery, [threadId, ticket.id]);

    return { ticket: updated.rows[0], threadId };
  } catch (error) {
    console.error('Error creating Discord thread via Agent:', error);
    // We still return the ticket, but with an error note
    return { ticket, threadId: null, error: error.message };
  }
};

// Get ticket by ID
const getTicket = async (ticketId) => {
  const query = `
    SELECT * FROM tickets WHERE id = $1;
  `;
  const result = await pool.query(query, [ticketId]);
  return result.rows[0] || null;
};

// List tickets for guild
const listTickets = async (guildId, status = null, limit = 50, offset = 0) => {
  let query = `
    SELECT * FROM tickets
    WHERE guild_id = $1
  `;
  const params = [guildId];

  if (status) {
    query += ` AND status = $2`;
    params.push(status);
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
};

// List tickets for guild for a specific user
const listTicketsForUser = async (guildId, userDiscordId, status = null, limit = 50, offset = 0) => {
  let query = `
    SELECT * FROM tickets
    WHERE guild_id = $1 AND user_discord_id = $2
  `;
  const params = [guildId, userDiscordId];

  if (status) {
    query += ` AND status = $3`;
    params.push(status);
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
};

// Close ticket
const closeTicket = async (ticketId, threadId) => {
  // Call Agent to close Discord thread
  if (threadId) {
    try {
        await fetch(`${BOT_API_URL}/api/internal/tickets/close`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Internal-Secret': INTERNAL_SECRET
            },
            body: JSON.stringify({ threadId })
        });
    } catch (error) {
      console.error('Error closing thread via Agent:', error);
    }
  }

  // Update ticket in DB
  const query = `
    UPDATE tickets
    SET status = 'closed', closed_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *;
  `;
  const result = await pool.query(query, [ticketId]);
  return result.rows[0];
};

// Add message to transcript
const addTicketMessage = async (ticketId, authorDiscordId, authorUsername, content, attachments = null) => {
  const query = `
    INSERT INTO ticket_messages (ticket_id, author_discord_id, author_username, content, attachments)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const result = await pool.query(query, [ticketId, authorDiscordId, authorUsername, content, attachments ? JSON.stringify(attachments) : null]);

  // Update message count
  await pool.query(`
    UPDATE tickets SET message_count = message_count + 1 WHERE id = $1;
  `, [ticketId]);

  return result.rows[0];
};

// Get transcript
const getTranscript = async (ticketId) => {
  const query = `
    SELECT * FROM ticket_messages
    WHERE ticket_id = $1
    ORDER BY created_at ASC;
  `;
  const result = await pool.query(query, [ticketId]);
  return result.rows;
};

// Generate HTML transcript
const generateHtmlTranscript = async (ticketId) => {
  const ticket = await getTicket(ticketId);
  const messages = await getTranscript(ticketId);

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ticket #${ticket.ticket_number} Transcript</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; background: #0f1220; color: #e6e8ef; padding: 20px; }
        .ticket-header { border-bottom: 2px solid #00e0ff; padding-bottom: 10px; margin-bottom: 20px; }
        .message { margin: 10px 0; padding: 10px; background: #12152a; border-left: 3px solid #00e0ff; }
        .author { font-weight: bold; color: #00e0ff; }
        .timestamp { font-size: 0.8em; color: #b6b9c6; }
      </style>
    </head>
    <body>
      <div class="ticket-header">
        <h1>Ticket #${ticket.ticket_number}: ${ticket.title}</h1>
        <p><strong>User:</strong> ${ticket.user_discord_id}</p>
        <p><strong>Status:</strong> ${ticket.status}</p>
        <p><strong>Created:</strong> ${new Date(ticket.created_at).toLocaleString()}</p>
      </div>
      <div class="messages">
  `;

  for (const msg of messages) {
    html += `
      <div class="message">
        <span class="author">${msg.author_username}</span>
        <span class="timestamp">${new Date(msg.created_at).toLocaleString()}</span>
        <p>${msg.content || '(no content)'}</p>
      </div>
    `;
  }

  html += `
      </div>
    </body>
    </html>
  `;

  return html;
};

module.exports = {
  createTicket,
  getTicket,
  listTickets,
  listTicketsForUser,
  closeTicket,
  addTicketMessage,
  getTranscript,
  generateHtmlTranscript,
};
