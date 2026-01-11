# Production Deployment Guide

## Critical Production Issues & Fixes

### 1. Environment Variables Setup

#### In Google Cloud Secret Manager:
1. Create secrets:
   - `INTERNAL_BOT_SECRET` - Shared secret for agent ↔ gateway communication
   - `BOT_TOKEN` - Discord bot token
   - `DATABASE_URL` - PostgreSQL connection string

2. Grant Cloud Run service accounts access to these secrets

#### Update Cloud Build Files:
Replace `YOUR_HASH` in both `cloudbuild.yaml` files with actual Cloud Run URLs after first deployment:

**qft-agent/cloudbuild.yaml:**
```yaml
- '--set-env-vars'
- 'API_GATEWAY_URL=https://api-gateway-abc123-uc.a.run.app'
```

**qft-api-gateway/cloudbuild.yaml:**
```yaml
- '--set-env-vars'
- 'BOT_API_URL=https://qft-agent-xyz789-uc.a.run.app'
```

### 2. Deployment Order

**CRITICAL:** Deploy in this order:
1. Deploy API Gateway first
2. Get the API Gateway URL from Cloud Run console
3. Update qft-agent's `cloudbuild.yaml` with the API Gateway URL
4. Deploy qft-agent

### 3. Known Limitations in Production

#### Discord.js Functions Won't Work from API Gateway
The following template functions require Discord.js client and won't work when called from API Gateway:

- `sendMessage` - ⚠️ Needs Discord client to fetch channels
- `sendDM` - ⚠️ Needs Discord client to access user objects
- `addRole`, `removeRole` - ⚠️ Needs Discord client for role management
- `editMessage`, `deleteMessage` - ⚠️ Needs Discord client
- All `get*` functions that fetch Discord data

**Solutions:**
1. **Option A (Current)**: These functions will fail silently or return errors when templates execute from API Gateway
2. **Option B (Recommended)**: Implement proxy endpoints in agent to handle Discord actions
3. **Option C (Fallback)**: For templates using Discord actions, keep execution local in agent

### 4. Service Health Monitoring

Add health checks to ensure both services are communicating:

**Agent startup check:**
```javascript
// In AgentCore.js after client ready
const healthCheck = await fetch(`${API_URL}/health`, {
  headers: { 'x-internal-secret': INTERNAL_SECRET }
}).catch(() => null);

if (!healthCheck || !healthCheck.ok) {
  console.error('⚠️ WARNING: Cannot reach API Gateway. Custom commands may not work.');
}
```

**Gateway startup check:**
```javascript
// In index.js after server starts
const healthCheck = await fetch(`${BOT_API_URL}/`, {
  headers: { 'internal-secret': INTERNAL_BOT_SECRET }
}).catch(() => null);

if (!healthCheck || !healthCheck.ok) {
  console.warn('⚠️ WARNING: Cannot reach Discord bot agent. Some template functions may not work.');
}
```

### 5. Error Handling

The current implementation has basic error handling in `customCommandHandler.js`:

```javascript
if (!response.ok) {
  throw new Error(`Template execution failed: ${response.statusText}`);
}
```

This will show users an error if the API Gateway is unreachable. Consider adding:
- Retry logic with exponential backoff
- Circuit breaker pattern
- Fallback to local execution for critical commands

### 6. Performance Considerations

**Network Latency:**
- Local execution: ~1-5ms
- API Gateway proxy: ~50-200ms (depending on region)

**Mitigation:**
- Use same GCP region for both services (currently `us-east1`)
- Enable keep-alive for HTTP connections
- Consider caching frequently used templates

### 7. Testing Checklist

Before deploying to production:

- [ ] Both services have matching `INTERNAL_BOT_SECRET`
- [ ] Agent has correct `API_GATEWAY_URL` (not localhost)
- [ ] Gateway has correct `BOT_API_URL` (not localhost)
- [ ] Both services can communicate (health check passes)
- [ ] Test a simple template: `{{ .User.ID }}`
- [ ] Test database functions: `{{ dbSet "test" "value" }}`
- [ ] Test registry functions: `{{ reg "test" }}`
- [ ] Verify Discord functions show appropriate errors or work via proxy

### 8. Rollback Plan

If production deployment fails:

1. Redeploy previous version of agent:
   ```bash
   gcloud run deploy qft-agent --image gcr.io/$PROJECT_ID/qft-agent:PREVIOUS_SHA
   ```

2. Restore local template execution:
   - Revert `customCommandHandler.js` to execute templates locally
   - Re-add `templateEngine.js` to agent
   - Remove API Gateway proxy code

### 9. Monitoring & Alerts

Set up Cloud Monitoring alerts for:
- Agent → Gateway request failures (> 5% error rate)
- Gateway → Agent request failures
- Template execution timeouts (> 5 seconds)
- Service-to-service authentication failures

### 10. Future Improvements

**Phase 2: Bidirectional Proxy**
Implement Discord action proxy endpoints in agent:
- `POST /api/internal/discord/sendMessage`
- `POST /api/internal/discord/addRole`
- `POST /api/internal/discord/editMessage`

This allows API Gateway to call back to agent for Discord operations.

**Phase 3: Hybrid Execution**
Templates with Discord actions execute locally, data-only templates execute in gateway.

---

## Quick Start Commands

```bash
# Deploy API Gateway first
cd apps/qft-api-gateway
gcloud builds submit --config cloudbuild.yaml

# Get the URL
gcloud run services describe api-gateway --region us-east1 --format 'value(status.url)'

# Update agent cloudbuild.yaml with the URL above, then:
cd ../qft-agent
gcloud builds submit --config cloudbuild.yaml

# Verify both are running
gcloud run services list --region us-east1
```

## Troubleshooting

**"Template execution failed" errors:**
- Check if API Gateway is running: `gcloud run services list`
- Verify `INTERNAL_BOT_SECRET` matches in both services
- Check logs: `gcloud run services logs read qft-agent` and `gcloud run services logs read api-gateway`

**"Discord client not available" errors:**
- Expected for Discord action functions when executed from gateway
- Verify the function is needed; if so, implement proxy endpoint in agent

**"Cannot reach API Gateway" on startup:**
- Verify `API_GATEWAY_URL` is set correctly (not localhost)
- Check network connectivity between Cloud Run services
- Ensure both services are in the same GCP project and region
