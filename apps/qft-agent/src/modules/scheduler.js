const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');
const { EmbedBuilder } = require('discord.js');

const SCHEDULE_FILE = path.join(__dirname, '..', 'db', 'embedSchedules.json');
let schedules = {};

function _save() {
    try { fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedules, null, 4)); } catch (err) { Logger.error('Failed to persist schedules', { err: err.message }); }
}

class Scheduler {
    constructor(client) {
        this.client = client; // optional reference
        try { schedules = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8')); } catch { schedules = {}; _save(); }
        this._startLoop();
    }

    scheduleEmbed(guildId, channelId, embedPayload, whenTs, repeatSeconds = 0) {
        const id = `job_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        schedules[id] = { id, guildId, channelId, embedPayload, nextRun: whenTs, repeatSeconds };
        _save();
        return schedules[id];
    }

    listJobs(guildId = null) {
        return Object.values(schedules).filter(j => (guildId ? j.guildId === guildId : true));
    }

    removeJob(id) {
        if (schedules[id]) { delete schedules[id]; _save(); return true; }
        return false;
    }

    async _runJob(job) {
        try {
            const guild = this.client?.guilds.cache.get(job.guildId);
            if (!guild) return;
            const channel = guild.channels.cache.get(job.channelId);
            if (!channel) return;
            const embed = EmbedBuilder.from(job.embedPayload);
            await channel.send({ embeds: [embed] });
        } catch (err) {
            Logger.error('Failed to run scheduled embed', { err: err.message });
        }
    }

    _startLoop() {
        setInterval(async () => {
            const now = Date.now();
            for (const id of Object.keys(schedules)) {
                const job = schedules[id];
                if (job.nextRun <= now) {
                    await this._runJob(job);
                    if (job.repeatSeconds && job.repeatSeconds > 0) {
                        job.nextRun = now + job.repeatSeconds * 1000;
                    } else {
                        delete schedules[id];
                    }
                    _save();
                }
            }
        }, 30 * 1000);
    }
}

module.exports = Scheduler;
