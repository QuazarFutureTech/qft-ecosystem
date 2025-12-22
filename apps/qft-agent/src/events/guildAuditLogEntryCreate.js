const logService = require('../services/logService');

module.exports = {
    name: 'guildAuditLogEntryCreate',
    async execute(auditLogEntry, guild, client) {
        try {
            if (!guild) return;

            // Map Discord audit log action types to our custom types
            const actionTypeMap = {
                0: 'member_ban',      // BAN
                1: 'member_kick',     // KICK
                2: 'member_mute',     // TIMEOUT (mute)
                20: 'role_assign',    // MEMBER_ROLE_UPDATE
                26: 'channel_delete', // CHANNEL_DELETE
                27: 'channel_create', // CHANNEL_CREATE
                32: 'member_warn',    // WARN (custom)
            };

            const actionType = actionTypeMap[auditLogEntry.action];
            if (!actionType) return; // Ignore unsupported actions

            const executorId = auditLogEntry.executor?.id;
            const targetId = auditLogEntry.target?.id;
            const reason = auditLogEntry.reason || 'No reason provided';

            if (!executorId || !targetId) return;

            // ===== BUILD ACTION DATA =====
            const actionData = {
                targetId,
                targetTag: auditLogEntry.target?.tag || 'Unknown',
                executorId,
                reason,
                actionType: auditLogEntry.action,
            };

            // Add type-specific data
            if (auditLogEntry.action === 0 || auditLogEntry.action === 1) {
                // BAN or KICK
                actionData.memberCount = guild.memberCount;
            } else if (auditLogEntry.action === 2) {
                // TIMEOUT (mute)
                const changes = auditLogEntry.changes || [];
                const timeoutChange = changes.find(c => c.key === 'communication_disabled_until');
                if (timeoutChange) {
                    actionData.timeoutUntil = timeoutChange.new;
                }
            } else if (auditLogEntry.action === 20) {
                // ROLE_UPDATE
                const changes = auditLogEntry.changes || [];
                actionData.changes = changes.map(c => ({
                    key: c.key,
                    old: c.old,
                    new: c.new,
                }));
            }

            // ===== LOG MODERATION ACTION (Production) =====
            try {
                await logService.logAction(guild.id, actionType, executorId, actionData, targetId, null, client);
            } catch (error) {
                console.error('Error logging moderation action:', error);
            }
        } catch (error) {
            console.error('Error in guildAuditLogEntryCreate event:', error);
        }
    },
};
