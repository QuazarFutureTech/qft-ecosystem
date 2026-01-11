const cron = require('node-cron');

class WorkerScheduler {
    constructor(client) {
        this.client = client;
        this.jobs = new Map(); // Map of jobId -> cronJob
    }

    /**
     * Start scheduling for all workers with schedule-type triggers
     */
    async initialize() {
        try {
            console.log('[WorkerScheduler] Initializing schedule-based workers...');
            // Workers will be scheduled via API calls from the API Gateway
            // The bot doesn't need direct database access for this
        } catch (error) {
            console.error('[WorkerScheduler] Error initializing:', error);
        }
    }

    /**
     * Create a new scheduled worker
     * @param {string} guildId - Guild ID
     * @param {string} workerId - Worker ID
     * @param {string} cronExpression - Cron expression (e.g., '0 0 * * *' for daily at midnight)
     * @param {object} triggerConfig - Trigger configuration with cron schedule
     */
    scheduleWorker(guildId, workerId, cronExpression, triggerConfig = {}) {
        try {
            // Support one-time, recurring, interval, and timezone-aware triggers
            let job;
            const jobId = `${guildId}_${workerId}`;
            const scheduledTrigger = require('../events/scheduledTrigger');
            // One-time (timestamp in ms or ISO string)
            if (triggerConfig.onceAt) {
                const runAt = typeof triggerConfig.onceAt === 'number' ? triggerConfig.onceAt : Date.parse(triggerConfig.onceAt);
                const delay = runAt - Date.now();
                if (delay > 0) {
                    job = setTimeout(async () => {
                        await scheduledTrigger.execute({
                            type: 'schedule',
                            triggeredAt: new Date().toISOString(),
                            guildId,
                            commandId: workerId,
                            ...triggerConfig,
                        }, this.client);
                        this.jobs.delete(jobId);
                    }, delay);
                    this.jobs.set(jobId, { stop: () => clearTimeout(job) });
                    console.log(`[WorkerScheduler] Scheduled one-time worker ${workerId} for ${new Date(runAt).toISOString()}`);
                    return jobId;
                } else {
                    throw new Error('onceAt time is in the past');
                }
            }
            // Interval (every X ms)
            if (triggerConfig.intervalMs) {
                job = setInterval(async () => {
                    await scheduledTrigger.execute({
                        type: 'schedule',
                        triggeredAt: new Date().toISOString(),
                        guildId,
                        commandId: workerId,
                        ...triggerConfig,
                    }, this.client);
                }, triggerConfig.intervalMs);
                this.jobs.set(jobId, { stop: () => clearInterval(job) });
                console.log(`[WorkerScheduler] Scheduled interval worker ${workerId} every ${triggerConfig.intervalMs}ms`);
                return jobId;
            }
            // Cron (recurring, with optional timezone)
            if (cronExpression) {
                if (!cron.validate(cronExpression)) {
                    throw new Error(`Invalid cron expression: ${cronExpression}`);
                }
                job = cron.schedule(cronExpression, async () => {
                    await scheduledTrigger.execute({
                        type: 'schedule',
                        triggeredAt: new Date().toISOString(),
                        guildId,
                        commandId: workerId,
                        ...triggerConfig,
                    }, this.client);
                }, { timezone: triggerConfig.timezone });
                this.jobs.set(jobId, job);
                console.log(`[WorkerScheduler] Scheduled cron worker ${workerId} in guild ${guildId} with cron: ${cronExpression} tz: ${triggerConfig.timezone || 'default'}`);
                return jobId;
            }
            throw new Error('No valid scheduling option provided');
        } catch (error) {
            console.error(`[WorkerScheduler] Error scheduling worker ${workerId}:`, error);
            throw error;
        }
    }

    /**
     * Stop a scheduled worker
     * @param {string} jobId - Job ID (guildId_workerId)
     */
    unscheduleWorker(jobId) {
        try {
            const job = this.jobs.get(jobId);
            if (job) {
                job.stop();
                this.jobs.delete(jobId);
                console.log(`[WorkerScheduler] Unscheduled job ${jobId}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`[WorkerScheduler] Error unscheduling worker ${jobId}:`, error);
            throw error;
        }
    }

    /**
     * Update a scheduled worker's cron expression
     * @param {string} jobId - Job ID
     * @param {string} newCronExpression - New cron expression
     * @param {string} workerId - Worker ID
     * @param {string} guildId - Guild ID
     * @param {object} triggerConfig - Updated trigger configuration
     */
    updateScheduledWorker(jobId, newCronExpression, workerId, guildId, triggerConfig = {}) {
        try {
            // Stop the old job
            this.unscheduleWorker(jobId);

            // Schedule with new expression
            return this.scheduleWorker(guildId, workerId, newCronExpression, triggerConfig);
        } catch (error) {
            console.error(`[WorkerScheduler] Error updating scheduled worker ${jobId}:`, error);
            throw error;
        }
    }

    /**
     * Get all active scheduled jobs
     */
    getActiveJobs() {
        return Array.from(this.jobs.entries()).map(([jobId, job]) => ({
            jobId,
            active: !job._destroyed,
        }));
    }

    /**
     * Shutdown all scheduled jobs (on bot disconnect)
     */
    shutdown() {
        try {
            for (const [jobId, job] of this.jobs.entries()) {
                job.stop();
            }
            this.jobs.clear();
            console.log('[WorkerScheduler] All scheduled jobs stopped');
        } catch (error) {
            console.error('[WorkerScheduler] Error shutting down:', error);
        }
    }
}

module.exports = WorkerScheduler;
