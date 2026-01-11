// qft-api-gateway/src/routes/templates.js
// Deprecated template execution endpoint - execution now handled by qft-agent

const express = require('express');
const router = express.Router();

/**
 * POST /api/internal/templates/execute
 * Execute a template with provided context
 * 
 * Body:
 * - template: string (template code)
 * - context: object (User, Member, Channel, Guild, Args, etc.)
 * - args: array (optional)
 * 
 * Returns:
 * - success: boolean
 * - output: string (rendered template)
 * - error: string (if failed)
 * - ephemeral: boolean (if template set ephemeral flag)
 */
router.post('/templates/execute', async (_req, res) => {
  return res.status(410).json({
    success: false,
    error: 'Gateway template execution has been removed. The Agent now executes templates using its Discord session.'
  });
});

module.exports = router;
