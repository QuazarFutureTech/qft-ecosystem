const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('schedule')
        .setDescription('Manage scheduled embeds')
        .addSubcommand(sc => sc.setName('list').setDescription('List scheduled embeds for this guild'))
        .addSubcommand(sc => sc.setName('remove').setDescription('Remove a scheduled embed')
            .addStringOption(o => o.setName('id').setDescription('Schedule job id').setRequired(true))),

    category: 'admin',

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const PlatformManager = require('../../PlatformManager');
        const scheduler = PlatformManager.get('scheduler');
        if (!scheduler) return interaction.reply({ content: 'Scheduler not available.', ephemeral: true });

        if (sub === 'list') {
            const jobs = scheduler.listJobs(interaction.guildId);
            if (!jobs.length) return interaction.reply({ content: 'No scheduled embeds for this guild.', ephemeral: true });
            const lines = jobs.map(j => `${j.id} -> channel: ${j.channelId}, next: ${new Date(j.nextRun).toISOString()}, repeat: ${j.repeatSeconds || 0}s`);
            // split into chunks if too long
            await interaction.reply({ content: lines.join('\n'), ephemeral: true });
        } else if (sub === 'remove') {
            const id = interaction.options.getString('id');
            const ok = scheduler.removeJob(id);
            if (ok) interaction.reply({ content: `Removed schedule ${id}`, ephemeral: true });
            else interaction.reply({ content: `No such schedule: ${id}`, ephemeral: true });
        }
    }
};
