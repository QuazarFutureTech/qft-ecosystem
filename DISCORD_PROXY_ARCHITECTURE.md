# Discord Action Proxy Architecture

## Overview
All Discord.js operations are now proxied from the API Gateway back to the Agent, maintaining clean separation of concerns.

## Architecture Pattern

```
Template Execution Flow:
1. Discord Event → Agent (qft-agent)
2. Agent → API Gateway: POST /api/internal/templates/execute
3. API Gateway: Execute template (business logic)
4. Template needs Discord action (e.g., sendMessage)
5. API Gateway → Agent: POST /api/internal/discord/sendMessage
6. Agent: Execute Discord.js operation
7. Agent → API Gateway: Return result
8. API Gateway → Agent: Return template output
9. Agent: Send to Discord
```

## Implemented Proxy Endpoints

### Agent Endpoints (`qft-agent/src/routes/discordActions.js`)

All endpoints secured with `internalAuth` middleware:

#### Message Operations
- `POST /api/internal/discord/sendMessage` - Send message/embed to channel
- `POST /api/internal/discord/sendDM` - Send DM to user
- `POST /api/internal/discord/editMessage` - Edit existing message
- `POST /api/internal/discord/deleteMessage` - Delete message (with optional delay)
- `POST /api/internal/discord/getMessage` - Fetch message details

#### Reaction Operations
- `POST /api/internal/discord/addReaction` - Add reaction to message
- `POST /api/internal/discord/removeReaction` - Remove reaction from message

#### Role Operations
- `POST /api/internal/discord/addRole` - Add role to member
- `POST /api/internal/discord/removeRole` - Remove role from member

#### Data Fetching
- `POST /api/internal/discord/fetchChannel` - Get channel information
- `POST /api/internal/discord/fetchMember` - Get member information

## Updated Template Functions

### API Gateway (`qft-api-gateway/src/services/templateEngine.js`)

All Discord-dependent functions now proxy through agent:

#### Updated Functions:
- `sendMessage(content, channelId)` - Proxied ✅
- `sendDM(content)` - Proxied ✅
- `editMessage(channelId, messageId, content, embed)` - Proxied ✅
- `deleteMessage(channelId, messageId, delaySeconds)` - Proxied ✅
- `addRole(roleId)` - Proxied ✅
- `removeRole(roleId)` - Proxied ✅
- `getMessage(channelId, messageId)` - Proxied ✅
- `addMessageReactions(channelId, messageId, ...emojis)` - Proxied ✅
- `deleteMessageReaction(channelId, messageId, userId, emoji)` - Proxied ✅
- `sendMessageNoEscapeRetID(channelId, content)` - Proxied ✅

#### Functions Still Using Discord.js Client:
These functions require the Discord.js client for complex operations and will only work when `this.client` is available (rare edge cases):

- `getRoleByName(name)` - Requires guild.roles.cache
- `getRoleById(id)` - Requires guild.roles.cache
- `getChannelByName(name)` - Requires guild.channels.cache
- `getChannelById(id)` - Requires guild.channels.cache
- `getMemberByName(name)` - Requires guild.members.fetch
- `getMemberById(id)` - Requires guild.members.fetch
- `getAllRoles()` - Requires guild.roles.cache
- `getAllChannels()` - Requires guild.channels.cache
- `getAllMembers()` - Requires guild.members.fetch
- `getMessages(channelId, limit)` - Requires channel.messages.fetch
- `getSelfMember()` - Requires guild.members.fetch
- `sendFile(channelId, buffer, filename)` - Requires channel.send with files

**Note**: These functions will gracefully fail with appropriate error messages when `this.client` is not available.

## Benefits

### 1. Clean Architecture
- **API Gateway**: Pure business logic, no platform dependencies
- **Agent**: Thin Discord adapter, no business logic
- **App**: Frontend UI, communicates with gateway

### 2. Multi-Platform Ready
- Easy to add Slack adapter, Telegram adapter, etc.
- Same business logic works across platforms
- Platform-specific code isolated in adapters

### 3. Testability
- Can test template logic without Discord.js
- Can mock Discord operations via HTTP
- Easier integration testing

### 4. Scalability
- API Gateway can scale independently
- Multiple agents can connect to same gateway
- Reduces Discord API rate limit risk

### 5. Maintainability
- Clear separation of concerns
- Single source of truth for business logic
- Platform changes don't affect business logic

## Security

All proxy endpoints require `INTERNAL_BOT_SECRET` authentication:

```javascript
const internalAuth = (req, res, next) => {
  const secret = req.headers['internal-secret'] || req.headers['x-internal-secret'];
  if (secret !== INTERNAL_SECRET) {
    return res.status(403).json({ message: 'Internal API access denied.' });
  }
  next();
};
```

## Production Configuration

### Environment Variables Required:

**qft-agent** (`.env`):
```
BOT_TOKEN=your_discord_bot_token
INTERNAL_BOT_SECRET=shared_secret_key
API_GATEWAY_URL=https://api-gateway-xyz.run.app  # Production URL
```

**qft-api-gateway** (`.env`):
```
DATABASE_URL=postgresql://...
INTERNAL_BOT_SECRET=shared_secret_key  # MUST match agent
BOT_API_URL=https://qft-agent-abc.run.app  # Production URL
```

### Cloud Run Configuration:

Both `cloudbuild.yaml` files updated with:
- Environment variable injection
- Secret Manager integration
- Service-to-service URLs

## Error Handling

All proxy functions include proper error handling:

```javascript
try {
  const response = await fetch(`${this.botApiUrl}/api/internal/discord/sendMessage`, {
    // ...config
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    return `Failed to send message: ${errorData.message}`;
  }
  
  return result;
} catch (err) {
  return `Failed to send message: ${err.message}`;
}
```

## Testing Recommendations

### Unit Tests
1. Test API Gateway template functions with mocked fetch()
2. Test Agent Discord operations with mocked Discord.js client
3. Test template execution with various context objects

### Integration Tests
1. Start both services locally
2. Test template with `{{ sendMessage "test" }}`
3. Verify Discord message appears
4. Test all proxy operations

### Load Tests
1. Measure proxy latency (expect ~50-200ms)
2. Test concurrent template executions
3. Verify no race conditions in Discord operations

## Future Improvements

### Phase 2: Enhanced Proxy
- Batch operations (multiple reactions in one call)
- Caching frequently accessed Discord data
- Webhook support for faster message sending

### Phase 3: Event Streaming
- WebSocket connection for real-time updates
- Push Discord events to API Gateway
- Reduce polling, improve responsiveness

### Phase 4: Multi-Platform
- Slack adapter with same proxy pattern
- Telegram adapter
- Unified template syntax across platforms

## Troubleshooting

### "Discord client not ready" errors
**Cause**: Agent hasn't connected to Discord yet  
**Solution**: Wait for agent startup, check BOT_TOKEN

### "Internal API access denied" errors
**Cause**: INTERNAL_BOT_SECRET mismatch  
**Solution**: Verify both services have matching secret

### "Failed to send message" errors
**Cause**: Invalid channel ID or permissions  
**Solution**: Check bot permissions in Discord server

### Slow template execution
**Cause**: Network latency between services  
**Solution**: Deploy both services in same GCP region

## Migration Checklist

- [x] Created Discord action proxy endpoints in agent
- [x] Updated template engine functions to use proxy
- [x] Removed Discord.js dependency attempts from gateway
- [x] Updated AgentCore to mount new routes
- [x] Updated cloudbuild.yaml files for production
- [x] Created comprehensive documentation
- [ ] Test locally with both services running
- [ ] Deploy to production
- [ ] Verify all custom commands work
- [ ] Monitor logs for proxy errors
- [ ] Set up alerts for service-to-service failures

---

**Last Updated**: January 1, 2026  
**Architecture Version**: 2.0 (Proxy Pattern)
