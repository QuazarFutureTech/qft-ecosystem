# QFT Ecosystem Architecture

## Overview
The QFT ecosystem follows a clean separation of concerns across three main components:

```
┌─────────────────────────────────────────┐
│         QFT API Gateway                 │
│  • Business Logic                       │
│  • Database Access (PostgreSQL, Redis) │
│  • Template Engine                      │
│  • Configuration Management             │
│  • User/Role/Permission System          │
└────────────┬───────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────────┐  ┌────▼────────┐
│ QFT Agent  │  │  QFT App    │
│ (Bot)      │  │ (Frontend)  │
└────────────┘  └─────────────┘
```

---

## Component Responsibilities

### 1. QFT API Gateway (`apps/qft-api-gateway`)
**Role:** Central business logic and data layer

**Responsibilities:**
- ✅ Database operations (PostgreSQL, Redis)
- ✅ Template engine execution
- ✅ User authentication & authorization
- ✅ Role & permission management
- ✅ Configuration storage
- ✅ REST API endpoints
- ✅ WebSocket server for real-time updates

**Key Files:**
- `index.js` - Express server setup
- `src/services/templateEngine.js` - YAGPDB-style template processor
- `src/services/commandService.js` - Custom command business logic
- `src/routes/` - API endpoints
- `src/db/` - Database connection and queries

**Dependencies:**
- PostgreSQL (main database)
- Redis (caching, websockets)
- Express (HTTP server)
- Socket.io (real-time communication)

---

### 2. QFT Agent (`apps/qft-agent`)
**Role:** Platform adapter (Discord bot container)

**Responsibilities:**
- ✅ Discord.js event handling
- ✅ Message/reaction/interaction events
- ✅ Proxy all business logic to API Gateway
- ✅ Execute Discord-specific operations (send messages, add reactions, etc.)
- ❌ NO business logic
- ❌ NO direct database access
- ❌ NO template execution (delegates to API Gateway)

**Key Files:**
- `src/AgentCore.js` - Discord client initialization
- `src/events/` - Discord event handlers
- `src/services/customCommandHandler.js` - Proxies template execution to API Gateway
- `src/adapters/DiscordAdapter.js` - Discord API wrapper

**Architecture Pattern:**
```javascript
// Agent ONLY handles Discord operations and proxies logic
async handleMessage(message) {
  // 1. Extract Discord context
  const context = buildContext(message);
  
  // 2. Send to API Gateway for processing
  const result = await fetch(`${API_URL}/api/internal/templates/execute`, {
    method: 'POST',
    body: JSON.stringify({ template, context })
  });
  
  // 3. Execute Discord actions with result
  await message.channel.send(result.output);
}
```

---

### 3. QFT App (`apps/qft-app`)
**Role:** User interface

**Responsibilities:**
- ✅ React frontend (Vite)
- ✅ Dashboard UI/UX
- ✅ Configuration forms
- ✅ User management interface
- ✅ Custom command builder
- ✅ Analytics & monitoring views
- ❌ NO business logic
- ❌ NO direct database access

**Key Files:**
- `src/components/` - React UI components
- `src/contexts/` - React context providers
- `src/services/` - API client wrappers
- `src/pages/` - Route pages

**Communication:**
- REST API calls to QFT API Gateway
- WebSocket connection for real-time updates
- OAuth2 authentication flow

---

## Data Flow Examples

### Example 1: Custom Command Execution
```
User sends !hello in Discord
         ↓
QFT Agent receives message event
         ↓
Agent extracts context (user, channel, guild)
         ↓
POST /api/internal/templates/execute
  { template: "{{ sendMessage 'Hi!' }}", context: {...} }
         ↓
API Gateway executes template
         ↓
Returns { output: "Hi!", success: true }
         ↓
Agent sends message to Discord channel
```

### Example 2: Dashboard Configuration
```
User edits command in dashboard
         ↓
QFT App sends PUT /api/v1/guilds/:id/commands/:index
         ↓
API Gateway validates & saves to PostgreSQL
         ↓
API Gateway broadcasts update via WebSocket
         ↓
QFT App receives real-time update
         ↓
UI refreshes with new data
```

---

## Benefits of This Architecture

### ✅ Separation of Concerns
- **API Gateway**: Business logic in one place
- **Agent**: Pure platform adapter
- **App**: Pure UI layer

### ✅ Maintainability
- Changes to business logic only touch API Gateway
- Can add new platform adapters (Slack, Telegram) without duplicating logic
- Frontend can be rebuilt without affecting backend

### ✅ Scalability
- API Gateway can be scaled horizontally
- Agents are stateless and can run multiple instances
- Frontend served via CDN (Vercel)

### ✅ Testing
- Business logic tested independently in API Gateway
- Agent tested for Discord API integration only
- Frontend tested for UI/UX

### ✅ Security
- Agents and App never access database directly
- All authentication/authorization in API Gateway
- Internal endpoints secured with `INTERNAL_BOT_SECRET`

---

## Migration Completed

### ✅ Template Engine Consolidation
**Before:**
- ❌ Template engine in both agent and API gateway
- ❌ Duplicated logic
- ❌ Confusion about where templates execute

**After:**
- ✅ Template engine **only** in API Gateway
- ✅ Agent proxies template execution via `/api/internal/templates/execute`
- ✅ Clear separation: API Gateway = logic, Agent = Discord adapter

### Files Removed from Agent:
- ❌ `src/services/templateEngine.js` (moved to API Gateway)
- ❌ `src/services/templateEngineQftService.js` (no longer needed)

### Files Added to API Gateway:
- ✅ `src/routes/templates.js` (template execution endpoint)

---

## Environment Variables

### API Gateway
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
INTERNAL_BOT_SECRET=secret_key
PORT=3001
```

### Agent
```env
DISCORD_BOT_TOKEN=...
API_GATEWAY_URL=http://localhost:3001
INTERNAL_BOT_SECRET=secret_key
```

### App
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

---

## Future Additions

### Multi-Platform Support
With this architecture, adding new platforms is straightforward:
1. Create new adapter (`qft-telegram-agent`, `qft-slack-agent`)
2. Implement platform-specific event handling
3. Proxy all logic to same API Gateway
4. No changes to business logic needed

### Microservices Evolution
If needed, API Gateway can be split into:
- `qft-api-auth` - Authentication service
- `qft-api-commands` - Command execution service
- `qft-api-analytics` - Analytics service

Agents and App continue to work with minimal changes.

---

## Development Workflow

1. **Start API Gateway:** `cd apps/qft-api-gateway && npm run dev`
2. **Start Agent:** `cd apps/qft-agent && npm run dev`
3. **Start App:** `cd apps/qft-app && npm run dev`

All services communicate via REST/WebSocket on localhost during development.

---

**Last Updated:** January 1, 2026  
**Architecture Version:** 2.0 (Post-Consolidation)
