const db = require('../db');

class SchedulerService {
  constructor() {
    this.cronJob = null;
  }

  /**
   * Start the scheduler - runs every minute to check for pending scheduled commands
   */
  start() {
    console.log('[SchedulerService] Starting command scheduler...');
    
    // Run every minute
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.processScheduledCommands();
    });
    
    console.log('[SchedulerService] Command scheduler started');
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
    try {
      // Get all scheduled commands that are due and not yet executed
      const result = await db.query(
        `SELECT * FROM scheduled_commands 
         WHERE executed = FALSE 
         AND scheduled_time <= NOW() 
         ORDER BY scheduled_time ASC 
         LIMIT 50`
      );

      if (result.rows.length > 0) {
        console.log(`[SchedulerService] Processing ${result.rows.length} scheduled commands`);
      }

      for (const scheduled of result.rows) {
        await this.executeScheduledCommand(scheduled);
      }
    } catch (error) {
      console.error('[SchedulerService] Error processing scheduled commands:', error);
    }
  }

  /**
   * Execute a single scheduled command
   */
  async executeScheduledCommand(scheduled) {
    const { id, command_code, context, guild_id } = scheduled;
    
    try {
      console.log(`[SchedulerService] Executing scheduled command #${id}`);
      
      // Create template engine instance with stored context
      const engine = new TemplateEngine(context || {});
      
      // Execute the command
      const result = await engine.execute(command_code);
      
      // Mark as executed
      await db.query(
        `UPDATE scheduled_commands 
         SET executed = TRUE, executed_at = NOW() 
         WHERE id = $1`,
        [id]
      );

      console.log(`[SchedulerService] Successfully executed scheduled command #${id}`);
      
      // TODO: Send result to Discord channel if channel_id is provided
      // This would require integration with the agent/bot
      
      return result;
    } catch (error) {
      console.error(`[SchedulerService] Error executing scheduled command #${id}:`, error);
      
      // Update with error
      await db.query(
        `UPDATE scheduled_commands 
         SET executed = TRUE, executed_at = NOW(), error = $2 
         WHERE id = $1`,
        [id, error.message]
      );
    }
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
