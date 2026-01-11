const db = require('../db');

class SchedulerService {
  constructor() {
    this.cronJob = null;
  }

  /**
   * Start the scheduler - runs every minute to check for pending scheduled commands
   */
  start() {
    // Gateway no longer executes scheduled commands; the agent owns execution.
    console.log('[SchedulerService] Gateway scheduler disabled. Delegating execution to the agent.');
    return;
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('[SchedulerService] Command scheduler stopped');
    }
  }

  /**
   * Process all pending scheduled commands that are due
   */
  async processScheduledCommands() {
    console.warn('[SchedulerService] processScheduledCommands invoked, but execution is handled by the agent.');
  }

  /**
   * Execute a single scheduled command
   */
  async executeScheduledCommand(scheduled) {
    const { id } = scheduled;
    // Mark record to avoid repeated attempts but leave note for agent ownership
    await db.query(
      `UPDATE scheduled_commands 
       SET executed = TRUE, executed_at = NOW(), error = $2 
       WHERE id = $1`,
      [id, 'Gateway scheduler disabled; execution handled by agent.']
    );
    console.warn(`[SchedulerService] Skipped execution for scheduled command #${id} (delegated to agent).`);
  }

  /**
   * Schedule a command for future execution
   * @param {Object} options - Scheduling options
   * @param {string} options.guildId - Guild ID
   * @param {string} options.commandName - Optional command name
   * @param {string} options.commandCode - Command template code
   * @param {string} options.channelId - Optional channel ID to send result
   * @param {string} options.userId - Optional user ID who scheduled
   * @param {Date|string} options.scheduledTime - When to execute
   * @param {Object} options.context - Context for command execution
   * @returns {Promise<Object>} Scheduled command record
   */
  async scheduleCommand(options) {
    const {
      guildId,
      commandName = null,
      commandCode,
      channelId = null,
      userId = null,
      scheduledTime,
      context = {}
    } = options;

    try {
      const result = await db.query(
        `INSERT INTO scheduled_commands 
         (guild_id, command_name, command_code, channel_id, user_id, scheduled_time, context)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [guildId, commandName, commandCode, channelId, userId, scheduledTime, JSON.stringify(context)]
      );

      console.log(`[SchedulerService] Scheduled command #${result.rows[0].id} for ${scheduledTime}`);
      return result.rows[0];
    } catch (error) {
      console.error('[SchedulerService] Error scheduling command:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled command
   */
  async cancelScheduledCommand(id) {
    try {
      await db.query(
        `DELETE FROM scheduled_commands WHERE id = $1 AND executed = FALSE`,
        [id]
      );
      console.log(`[SchedulerService] Cancelled scheduled command #${id}`);
    } catch (error) {
      console.error('[SchedulerService] Error cancelling scheduled command:', error);
      throw error;
    }
  }

  /**
   * Get scheduled commands for a guild
   */
  async getScheduledCommands(guildId, includeExecuted = false) {
    try {
      let query = `SELECT * FROM scheduled_commands WHERE guild_id = $1`;
      
      if (!includeExecuted) {
        query += ` AND executed = FALSE`;
      }
      
      query += ` ORDER BY scheduled_time ASC`;
      
      const result = await db.query(query, [guildId]);
      return result.rows;
    } catch (error) {
      console.error('[SchedulerService] Error getting scheduled commands:', error);
      throw error;
    }
  }
}

// Export singleton instance
const schedulerService = new SchedulerService();
module.exports = schedulerService;
