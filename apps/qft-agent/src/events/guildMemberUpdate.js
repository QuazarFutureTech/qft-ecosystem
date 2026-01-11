const CustomCommandHandler = require('../services/customCommandHandler');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember, client) {
        const guildId = newMember.guild.id;
        if (!guildId) return;
        try {
            const handler = new CustomCommandHandler(client);
            const allCommands = await handler.getGuildCommandsCached(guildId);
            // Get role IDs before and after
            const oldRoles = new Set(oldMember.roles.cache.keys());
            const newRoles = new Set(newMember.roles.cache.keys());
            // Roles added
            const addedRoles = [...newRoles].filter(r => !oldRoles.has(r));
            // Roles removed
            const removedRoles = [...oldRoles].filter(r => !newRoles.has(r));

            // --- Role Add Triggers ---
            for (const roleId of addedRoles) {
                const addCommands = allCommands.filter(cmd => cmd.trigger_type === 'role_add');
                console.log(`[guildMemberUpdate] [DEBUG] Loaded ${addCommands.length} role_add trigger commands for guild: ${guildId}`);
                for (const command of addCommands) {
                    const td = command.trigger_data || {};
                    // Support array or single roleId
                    if (td.roleId && Array.isArray(td.roleId) && !td.roleId.includes(roleId)) continue;
                    if (td.roleId && !Array.isArray(td.roleId) && td.roleId !== roleId) continue;
                    // Exclude users/roles
                    if (td.excludeUsers && td.excludeUsers.includes(newMember.id)) continue;
                    if (td.excludeRoles && td.excludeRoles.some(r => newRoles.has(r))) continue;
                    // Only fire if user is in includeUsers (if set)
                    if (td.includeUsers && !td.includeUsers.includes(newMember.id)) continue;
                    await handler.executeCommand(command, { oldMember, newMember, roleId, type: 'role_add' }, [], {});
                    console.log(`[guildMemberUpdate] [DEBUG] Executed role_add trigger command: ${command.command_name} (${command.id}) for user: ${newMember.id}`);
                }
            }
            // --- Role Remove Triggers ---
            for (const roleId of removedRoles) {
                const removeCommands = allCommands.filter(cmd => cmd.trigger_type === 'role_remove');
                console.log(`[guildMemberUpdate] [DEBUG] Loaded ${removeCommands.length} role_remove trigger commands for guild: ${guildId}`);
                for (const command of removeCommands) {
                    const td = command.trigger_data || {};
                    if (td.roleId && Array.isArray(td.roleId) && !td.roleId.includes(roleId)) continue;
                    if (td.roleId && !Array.isArray(td.roleId) && td.roleId !== roleId) continue;
                    if (td.excludeUsers && td.excludeUsers.includes(newMember.id)) continue;
                    if (td.excludeRoles && td.excludeRoles.some(r => oldRoles.has(r))) continue;
                    if (td.includeUsers && !td.includeUsers.includes(newMember.id)) continue;
                    await handler.executeCommand(command, { oldMember, newMember, roleId, type: 'role_remove' }, [], {});
                    console.log(`[guildMemberUpdate] [DEBUG] Executed role_remove trigger command: ${command.command_name} (${command.id}) for user: ${newMember.id}`);
                }
            }
            // --- General Role Update Triggers (any change) ---
            if (addedRoles.length > 0 || removedRoles.length > 0) {
                const updateCommands = allCommands.filter(cmd => cmd.trigger_type === 'role_update');
                console.log(`[guildMemberUpdate] [DEBUG] Loaded ${updateCommands.length} role_update trigger commands for guild: ${guildId}`);
                for (const command of updateCommands) {
                    const td = command.trigger_data || {};
                    // Only fire for certain change types
                    if (td.changeType) {
                        if (td.changeType === 'add' && removedRoles.length > 0) continue;
                        if (td.changeType === 'remove' && addedRoles.length > 0) continue;
                    }
                    // Only fire for specific role combos
                    if (td.roleCombo && Array.isArray(td.roleCombo)) {
                        const hasCombo = td.roleCombo.every(r => newRoles.has(r));
                        if (!hasCombo) continue;
                    }
                    if (td.excludeUsers && td.excludeUsers.includes(newMember.id)) continue;
                    if (td.excludeRoles && td.excludeRoles.some(r => newRoles.has(r))) continue;
                    if (td.includeUsers && !td.includeUsers.includes(newMember.id)) continue;
                    await handler.executeCommand(command, { oldMember, newMember, addedRoles, removedRoles, type: 'role_update' }, [], {});
                    console.log(`[guildMemberUpdate] [DEBUG] Executed role_update trigger command: ${command.command_name} (${command.id}) for user: ${newMember.id}`);
                }
            }
        } catch (err) {
            console.error('[CustomCommandHandler] Error handling role update trigger:', err);
        }
    }
};
