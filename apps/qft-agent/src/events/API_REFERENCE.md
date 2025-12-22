# Event Handler API Reference

## Overview
This document provides technical reference for all Discord event handlers and their integration with backend services.

---

## Event Handler Details

### 1. messageCreate.js

**Discord Event**: `messageCreate`  
**Trigger**: Any message sent in a guild

**Imports**:
```javascript
const commandService = require('../services/commandService');
const logService = require('../services/logService');
const workerService = require('../services/workerService');
const ConfigManager = require('../utils/ConfigManager');
```

**Execution Flow**:
```javascript
1. Check if message is from bot → return early
2. Try to get command from production DB
3. If not found, fallback to ConfigManager commands
4. Execute command (production > config > ignore)
5. Log action to audit_logs + Discord channel
6. Dispatch all message-type workers with trigger data
```

**Logged Action Type**: `message_sent` or `custom_command`

**Worker Trigger Payload**:
```javascript
{
  type: 'message',
  userId: interaction.author.id,
  content: message.content,
  channelId: message.channelId,
  isCommand: true/false // based on prefix/command status
}
```

**Error Handling**: Logs errors to console and audit_logs, doesn't interrupt bot

---

### 2. guildMemberAdd.js

**Discord Event**: `guildMemberAdd`  
**Trigger**: User joins the guild

**Imports**:
```javascript
const logService = require('../services/logService');
const ConfigManager = require('../utils/ConfigManager');
```

**Execution Flow**:
```javascript
1. Send welcome message from ConfigManager (if configured)
2. Log member join action with account age
3. Dispatch all user_join-type workers
```

**Logged Action Type**: `member_join`

**Logged Details**:
```javascript
{
  memberId: member.id,
  username: member.user.username,
  tag: member.user.tag,
  joinedAt: new Date().toISOString(),
  accountAgeMs: Date.now() - member.user.createdTimestamp,
  accountAgeDays: Math.floor((Date.now() - member.user.createdTimestamp) / 86400000)
}
```

**Worker Trigger Payload**:
```javascript
{
  type: 'user_join',
  userId: member.id,
  username: member.user.username,
  accountAge: member.user.createdTimestamp,
  joinedAt: Date.now()
}
```

---

### 3. guildMemberRemove.js

**Discord Event**: `guildMemberRemove`  
**Trigger**: User leaves or is removed from guild

**Imports**:
```javascript
const logService = require('../services/logService');
const ConfigManager = require('../utils/ConfigManager');
```

**Execution Flow**:
```javascript
1. Calculate member tenure (how long they were in guild)
2. Log member leave action
3. Send goodbye message from ConfigManager (if configured)
4. Dispatch all user_leave-type workers
```

**Logged Action Type**: `member_leave`

**Logged Details**:
```javascript
{
  memberId: member.id,
  username: member.user.username,
  tag: member.user.tag,
  leftAt: new Date().toISOString(),
  tenureMs: Date.now() - member.joinedTimestamp,
  tenureDays: Math.floor((Date.now() - member.joinedTimestamp) / 86400000),
  roles: member.roles.cache.map(r => ({ id: r.id, name: r.name }))
}
```

**Worker Trigger Payload**:
```javascript
{
  type: 'user_leave',
  userId: member.id,
  username: member.user.username,
  leftAt: Date.now(),
  tenure: member.joinedTimestamp
}
```

---

### 4. interactionCreate.js

**Discord Events**: `interactionCreate`  
**Triggers**: 
- Slash commands
- Button clicks
- Modal submissions
- Select menu interactions

**Imports**:
```javascript
const logService = require('../services/logService');
const ticketService = require('../services/ticketService');
const ConfigManager = require('../utils/ConfigManager');
```

#### 4.1 Slash Commands

**Execution Flow**:
```javascript
1. Check if interaction is slash command
2. Get command from client.commands
3. Verify category is enabled via ConfigManager
4. Execute command.execute(interaction, client)
5. Log execution (success/error) to audit_logs
6. Handle errors with Discord API compliance (3-second rule)
```

**Logged Action Type**: `slash_command`

**Logged Details**:
```javascript
{
  commandName: string,
  options: SlashCommandOption[],
  status: 'executed' | 'error',
  error?: string // if status is error
}
```

#### 4.2 Button Interactions

**Custom ID Patterns**:
- `create_ticket` → Shows ticket modal
- `close_ticket_[ticketId]` → Closes ticket thread

**Create Ticket Button**:
```javascript
// Shows modal with fields:
// - ticket_title (required, short text)
// - ticket_description (optional, long text)
```

**Close Ticket Button**:
```javascript
// Closes the ticket thread and archives messages
// Logs ticket_closed action
// Calls ticketService.closeTicket(ticketId, threadId, client)
```

**Logged Action Type**: `button_interaction`

#### 4.3 Modal Submissions

**Custom ID**: `ticket_modal`

**Fields**:
- `ticket_title`: Brief description (required)
- `ticket_description`: Detailed description (optional)

**Execution Flow**:
```javascript
1. Extract form values
2. Get ticketChannelId from ConfigManager
3. Call ticketService.createTicket()
4. Log ticket_created action
5. Reply with ticket number and thread link
```

**Logged Action Type**: `ticket_created`

**Logged Details**:
```javascript
{
  ticketId: string,
  ticketNumber: number,
  title: string,
  description?: string
}
```

---

### 5. messageReactionAdd.js

**Discord Event**: `messageReactionAdd`  
**Trigger**: User adds emoji reaction to a message

**Imports**:
```javascript
const workerService = require('../services/workerService');
const logService = require('../services/logService');
```

**Execution Flow**:
```javascript
1. Ignore bot reactions
2. Fetch full reaction if partial
3. Get all reaction-type workers for guild
4. Filter workers by emoji (if configured)
5. Execute matching workers
6. Log reaction action
```

**Logged Action Type**: `message_reaction`

**Logged Details**:
```javascript
{
  messageId: string,
  emoji: string, // emoji name or unicode
  emojiId?: string,
  channelId: string,
  count: number // total reactions with this emoji
}
```

**Worker Trigger Payload**:
```javascript
{
  type: 'reaction',
  userId: string,
  messageId: string,
  channelId: string,
  emoji: string,
  emojiId: string | null,
  count: number
}
```

**Worker Filter Config Example**:
```javascript
// In worker trigger_config:
{
  type: 'reaction',
  emoji: '👍', // Only match this emoji
  // OR
  // emoji: '123456789' // Match by emoji ID for custom emojis
}
```

---

### 6. guildAuditLogEntryCreate.js

**Discord Event**: `guildAuditLogEntryCreate`  
**Trigger**: Moderation action or channel/role change

**Imports**:
```javascript
const logService = require('../services/logService');
```

**Supported Actions**:

| Discord Action ID | Custom Type | Example |
|---|---|---|
| 0 | `member_ban` | User banned from guild |
| 1 | `member_kick` | User kicked from guild |
| 2 | `member_mute` | User timeout applied |
| 20 | `role_assign` | Role added/removed from member |
| 26 | `channel_delete` | Channel deleted |
| 27 | `channel_create` | Channel created |
| 32 | `member_warn` | Custom warning (stub) |

**Execution Flow**:
```javascript
1. Check if action is supported
2. Extract executor, target, reason
3. Map Discord action type to custom type
4. Add type-specific metadata
5. Log action to audit_logs
```

**Logged Action Types**: `member_ban`, `member_kick`, `member_mute`, `role_assign`, `channel_delete`, `channel_create`

**Logged Details Examples**:

**Ban/Kick**:
```javascript
{
  targetId: string,
  targetTag: string,
  executorId: string,
  reason: string,
  memberCount: number // guild member count at time of action
}
```

**Mute/Timeout**:
```javascript
{
  targetId: string,
  targetTag: string,
  executorId: string,
  reason: string,
  timeoutUntil: ISO timestamp
}
```

**Role Assignment**:
```javascript
{
  targetId: string,
  executorId: string,
  reason: string,
  changes: [
    {
      key: string, // 'roles'
      old: Array, // previous roles
      new: Array // new roles
    }
  ]
}
```

---

### 7. voiceStateUpdate.js

**Discord Event**: `voiceStateUpdate`  
**Trigger**: Voice state changes (join, leave, mute, deafen)

**Imports**:
```javascript
const logService = require('../services/logService');
const workerService = require('../services/workerService');
```

**Sub-Events**:

#### 7.1 Voice Join
**Condition**: `!oldState.channel && newState.channel`

**Logged Action Type**: `voice_join`

**Logged Details**:
```javascript
{
  channelId: string,
  channelName: string
}
```

**Worker Trigger Payload**:
```javascript
{
  type: 'voice_join',
  userId: string,
  channelId: string,
  channelName: string
}
```

#### 7.2 Voice Leave
**Condition**: `oldState.channel && !newState.channel`

**Logged Action Type**: `voice_leave`

**Logged Details**:
```javascript
{
  channelId: string,
  channelName: string
}
```

**Worker Trigger Payload**:
```javascript
{
  type: 'voice_leave',
  userId: string,
  channelId: string,
  channelName: string
}
```

#### 7.3 Voice Switch
**Condition**: `oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id`

**Logged Action Type**: `voice_switch`

**Logged Details**:
```javascript
{
  oldChannelId: string,
  oldChannelName: string,
  newChannelId: string,
  newChannelName: string
}
```

#### 7.4 Mute Toggle
**Condition**: `oldState.selfMute !== newState.selfMute`

**Logged Action Type**: `voice_mute_toggle`

**Logged Details**:
```javascript
{
  muted: boolean,
  channelId?: string,
  channelName?: string
}
```

#### 7.5 Deafen Toggle
**Condition**: `oldState.selfDeaf !== newState.selfDeaf`

**Logged Action Type**: `voice_deaf_toggle`

**Logged Details**:
```javascript
{
  deafened: boolean,
  channelId?: string,
  channelName?: string
}
```

---

## Worker Dispatch Reference

### Trigger Matching Logic

Each event handler dispatches workers based on trigger type:

```javascript
// Get workers for this guild with matching trigger type
const workers = await workerService.getWorkersByTrigger(guildId, triggerType);

// For each matching worker
for (const worker of workers) {
  // Validate that trigger conditions are met
  if (!worker.trigger_config) continue;
  
  // For reactions: check emoji match
  if (triggerType === 'reaction' && worker.trigger_config.emoji) {
    if (worker.trigger_config.emoji !== payload.emoji) continue;
  }
  
  // Execute the worker
  await workerService.executeWorker(worker.id, guildId, payload, client);
}
```

### Action Execution Context

When a worker's action is executed, it receives:

```javascript
{
  action: {
    type: 'send_message' | 'assign_role' | 'send_dm' | 'api_call',
    params: { /* action-specific parameters */ }
  },
  triggerData: { /* trigger payload from event */ },
  guildId: string,
  client: DiscordClient // Discord.js client instance
}
```

---

## Error Handling Strategy

### Event Handler Error Isolation

All handlers follow this pattern:

```javascript
try {
  // Main logic
  await doSomething();
} catch (error) {
  console.error('Error in [eventName]:', error);
  // Log to audit_logs if possible
  // Don't throw - let other handlers continue
}
```

### Worker Dispatch Error Handling

Worker failures don't block event processing:

```javascript
for (const worker of workers) {
  try {
    await workerService.executeWorker(...);
  } catch (error) {
    console.error(`Worker ${worker.id} failed:`, error);
    // Continue to next worker
  }
}
```

### Discord API Compliance

The `interactionCreate` handler respects Discord's 3-second reply rule:

```javascript
if (interaction.deferred || interaction.replied) {
  await interaction.followUp({ content: '...', ephemeral: true });
} else {
  await interaction.reply({ content: '...', ephemeral: true });
}
```

---

## Performance Considerations

### Event Handler Timing

| Handler | Expected Duration | Critical Path |
|---|---|---|
| messageCreate | 100-500ms | Command parsing, DB query |
| guildMemberAdd | 50-200ms | Welcome message send |
| guildMemberRemove | 50-200ms | Goodbye message send |
| interactionCreate | 500ms-2s | Ticket creation, Discord thread |
| messageReactionAdd | 100-300ms | Worker fetch, execution |
| guildAuditLogEntryCreate | 50-150ms | Action mapping, log write |
| voiceStateUpdate | 50-150ms | Channel lookup, log write |

### Optimization Tips

1. **Defer worker execution**: Use `setTimeout(..., 0)` for non-critical worker dispatch
2. **Batch log writes**: Consider queuing logs and writing in batches
3. **Cache guild settings**: Use ConfigManager cache effectively
4. **Limit worker count**: Archive old/inactive workers from database
5. **Monitor execution times**: Track slow handlers with instrumentation

---

## Testing Examples

### Unit Test: messageCreate Handler

```javascript
describe('messageCreate', () => {
  it('should log command execution', async () => {
    const message = { /* mock message */ };
    await messageCreateHandler.execute(message);
    
    expect(logService.logAction).toHaveBeenCalledWith(
      expect.any(String), // guildId
      expect.stringMatching(/custom_command|message_sent/),
      message.author.id,
      expect.any(Object)
    );
  });
});
```

### Integration Test: Reaction Worker Dispatch

```javascript
describe('messageReactionAdd → Worker Dispatch', () => {
  it('should dispatch matching reaction workers', async () => {
    // Create mock worker with reaction trigger
    const worker = await createWorker({
      trigger: { type: 'reaction', emoji: '👍' }
    });
    
    // Simulate reaction
    const reaction = { emoji: { name: '👍' } };
    const user = { id: 'userId123' };
    
    await messageReactionAddHandler.execute(reaction, user);
    
    // Verify worker was executed
    expect(workerService.executeWorker).toHaveBeenCalledWith(worker.id, ...);
  });
});
```

---

## Debugging

### Enable Verbose Logging

Add to each handler:
```javascript
const DEBUG = process.env.DEBUG_EVENTS === 'true';
if (DEBUG) console.log(`[${eventName}]`, { ...data });
```

### Monitor Event Processing

```javascript
// Hook into Discord.js client
client.on('debug', msg => {
  if (msg.includes('event')) console.log(msg);
});
```

### Audit Log Inspection

```bash
# Query recent logs for specific event type
SELECT * FROM audit_logs 
WHERE action_type = 'message_sent' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Version History

| Version | Date | Changes |
|---|---|---|
| 1.0 | Current | Initial implementation of 7 event handlers with full production integration |

