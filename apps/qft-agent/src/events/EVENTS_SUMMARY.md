# QFT Agent Event Handlers Summary

This document outlines all Discord event handlers and their integration with production modules.

## Event Handlers Overview

### 1. **messageCreate.js** ✅
- **Triggers**: Every message sent in Discord
- **Integrations**:
  - Production command execution (via `commandService.getCommand()`)
  - Audit logging (via `logService.logAction()`)
  - Worker dispatch for `message`-type triggers (via `workerService.executeWorker()`)
- **Features**:
  - Fallback chain: Production DB commands → Config-based commands
  - Logs all command executions (success/error) to audit_logs table
  - Dispatches workers with message trigger data (content, author, channel)
  - Preserves bot command prefix checking

### 2. **guildMemberAdd.js** ✅
- **Triggers**: User joins the guild
- **Integrations**:
  - Member join logging (via `logService.logAction()`)
  - Worker dispatch for `user_join`-type triggers
- **Features**:
  - Logs member join with account age tracking
  - Preserves welcome message system (from ConfigManager)
  - Dispatches user_join workers with membership details
  - Records joiner's ID, username, join timestamp, and account age

### 3. **guildMemberRemove.js** ✅
- **Triggers**: User leaves or is removed from guild
- **Integrations**:
  - Member leave logging (via `logService.logAction()`)
  - Worker dispatch for `user_leave`-type triggers
- **Features**:
  - Logs member departure with tenure calculation
  - Preserves goodbye message system
  - Dispatches user_leave workers with membership tenure
  - Records leaver's ID, username, leave timestamp, and tenure

### 4. **interactionCreate.js** ✅
- **Triggers**: Slash commands, buttons, modals, select menus
- **Sub-triggers**:
  - **Slash Commands**: Dispatches to command.execute()
  - **Buttons**: Ticket creation, ticket closure, custom actions
  - **Modals**: Ticket creation form submission
- **Integrations**:
  - Slash command logging (via `logService.logAction()`)
  - Ticket creation/closure (via `ticketService`)
  - Button interaction handlers with modal support
- **Features**:
  - Category-based command filtering (via ConfigManager)
  - Error handling with Discord API compliance (3-second reply rule)
  - Ticket panel buttons trigger modal forms
  - Modal submissions create support threads
  - Logs all command executions and errors

### 5. **messageReactionAdd.js** ✅
- **Triggers**: User adds emoji reaction to message
- **Integrations**:
  - Worker dispatch for `reaction`-type triggers (via `workerService.executeWorker()`)
  - Reaction logging (via `logService.logAction()`)
- **Features**:
  - Supports emoji filtering in worker trigger config
  - Logs reaction with emoji, message, and channel info
  - Dispatches workers with reaction payload (emoji, count, message details)
  - Handles partial message/reaction fetching from cache

### 6. **guildAuditLogEntryCreate.js** ✅
- **Triggers**: Moderation actions (ban, kick, mute, role updates, etc.)
- **Integrations**:
  - Moderation action logging (via `logService.logAction()`)
- **Features**:
  - Maps Discord audit log actions to custom action types:
    - 0 → `member_ban`
    - 1 → `member_kick`
    - 2 → `member_mute` (timeout)
    - 20 → `role_assign`
    - 26 → `channel_delete`
    - 27 → `channel_create`
  - Logs action reason, executor, and target
  - Records timeout duration for mute actions
  - Preserves action context (member count, role changes)

### 7. **voiceStateUpdate.js** ✅
- **Triggers**: Voice channel events (join, leave, switch, mute, deafen)
- **Sub-triggers**:
  - **voice_join**: User joins a voice channel
  - **voice_leave**: User leaves a voice channel
  - **voice_switch**: User moves to different voice channel
  - **voice_mute_toggle**: User mutes/unmutes microphone
  - **voice_deaf_toggle**: User deafens/undeafens
- **Integrations**:
  - Worker dispatch for `voice_join`, `voice_leave`, `voice_switch` triggers
  - Voice action logging (via `logService.logAction()`)
- **Features**:
  - Separate workers for different voice event types
  - Logs channel names and IDs
  - Tracks mute/deafen status changes
  - Dispatches workers with channel and user metadata

### 8. **clientReady.js** (Existing)
- **Triggers**: Bot connects and is ready
- **Status**: Unchanged (original implementation preserved)

---

## Integration Architecture

```
User Action
    ↓
Discord Event Handler
    ↓
    ├─→ logService.logAction() → audit_logs table → log channel embeds
    ├─→ workerService.executeWorker() → Execute actions → DB + Discord updates
    ├─→ commandService (messageCreate only) → Execute custom/config commands
    └─→ ticketService (interactionCreate only) → Create/close Discord threads
    ↓
QFT App Frontend (via API)
```

---

## Worker Trigger Types (Event-Driven)

| Trigger Type | Event Handler | Payload Fields |
|---|---|---|
| `message` | messageCreate | content, authorId, channelId, isCommand |
| `user_join` | guildMemberAdd | memberId, username, joinedAt, accountAge |
| `user_leave` | guildMemberRemove | memberId, username, leftAt, tenure |
| `reaction` | messageReactionAdd | messageId, emoji, emojiId, count, channelId |
| `voice_join` | voiceStateUpdate | userId, channelId, channelName |
| `voice_leave` | voiceStateUpdate | userId, channelId, channelName |
| `voice_switch` | voiceStateUpdate | oldChannelId, newChannelId, channelNames |
| `schedule` | workerScheduler | triggeredAt, cron expression |

---

## Action Types Supported

All actions are executed by the `workerService`:

| Action Type | Handler | Discord Integration |
|---|---|---|
| `send_message` | executeAction() | Sends to specified channelId |
| `assign_role` | executeAction() | Assigns roleId to userId |
| `send_dm` | executeAction() | Sends DM to userId |
| `log_event` | executeAction() | Logs to audit_logs (stub) |
| `api_call` | executeAction() | External HTTP requests |
| `notify_reddit` | executeAction() | Reddit notification (stub) |
| `post_twitter` | executeAction() | Twitter/X posting (stub) |

---

## API Integration Points

### Bot Internal API (AgentCore.js)

All event handlers can trigger these internal API endpoints:

- `GET /api/guilds/:userId` - User's mutual guilds
- `POST /api/guilds/:guildId/custom-commands` - Create custom command
- `GET /api/guilds/:guildId/custom-commands` - List custom commands
- `DELETE /api/guilds/:guildId/custom-commands/:name` - Delete custom command
- `POST /api/guilds/:guildId/members/:userId/:action` - Moderation (ban/kick/timeout)

### Worker Scheduler API (New)

- `GET /api/scheduler/jobs` - List active scheduled jobs
- `POST /api/scheduler/schedule` - Schedule new worker
- `PUT /api/scheduler/schedule/:jobId` - Update worker schedule
- `DELETE /api/scheduler/schedule/:jobId` - Unschedule worker

---

## Database Tables Involved

All event handlers write to these tables:

1. **audit_logs** - All action logging
2. **worker_executions** - Worker execution history
3. **tickets** - Ticket creation (interactionCreate)
4. **ticket_messages** - Thread message archive (ticket system)
5. **log_channels** - Log channel configuration

---

## Error Handling

- All event handlers wrap logic in try-catch blocks
- Errors are logged to console and audit_logs
- Discord API 3-second reply rule is respected in interactionCreate
- Worker dispatch failures don't break event flow

---

## Next Steps: React Components

Once event handlers are production-tested, the following React components can be wired:

- **TicketPanel.jsx** - Dashboard for ticket management
- **LogsViewer.jsx** - Staff audit log viewer
- **WorkerBuilder.jsx** - Workflow UI for creating workers
- **CustomCommandEditor.jsx** - Command creation/editing (needs scaffolding)
- **BackupManager.jsx** - Backup/restore UI (needs scaffolding)

---

## Testing Checklist

- [ ] Message commands execute and log correctly
- [ ] Member join events trigger user_join workers
- [ ] Member leave events trigger user_leave workers
- [ ] Reactions dispatch reaction-type workers
- [ ] Moderation actions appear in audit logs
- [ ] Voice events log and dispatch workers
- [ ] Slash commands execute with proper error handling
- [ ] Ticket creation via button/modal works
- [ ] Worker scheduler cron jobs trigger on schedule
- [ ] Log channels receive formatted embeds

---

## Production Deployment Notes

1. Ensure PostgreSQL is running with all migration tables created
2. Install `node-cron` in qft-agent: `npm install node-cron`
3. Set environment variables for PGUSER, PGHOST, PGDATABASE, PGPASSWORD, PGPORT
4. Workers must be created via API before events can dispatch them
5. Log channels must be configured per guild via `setupLogChannel()`
6. Slash commands must be registered in Discord Developer Portal

