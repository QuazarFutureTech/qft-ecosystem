const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ConfigManager = require('../../utils/ConfigManager');
const Scheduler = require('../../modules/scheduler');

// scheduler singleton will be attached during runtime by PlatformManager

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Create an embed and optionally post it to a channel')
        .addSubcommand(sc => sc.setName('post').setDescription('Post embed immediately')
            .addStringOption(opt => opt.setName('title').setDescription('Embed title'))
            .addStringOption(opt => opt.setName('description').setDescription('Embed description'))
            .addStringOption(opt => opt.setName('color').setDescription('Hex color (e.g., #00ff00)'))
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post embed in')))
        .addSubcommand(sc => sc.setName('schedule').setDescription('Schedule an embed')
            .addStringOption(o => o.setName('when').setDescription('ISO datetime for when to post (e.g., 2025-12-15T20:00:00Z)').setRequired(true))
            .addStringOption(opt => opt.setName('title').setDescription('Embed title'))
            .addStringOption(opt => opt.setName('description').setDescription('Embed description'))
            .addStringOption(opt => opt.setName('color').setDescription('Hex color (e.g., #00ff00)'))
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post embed in'))
            .addIntegerOption(o => o.setName('repeat').setDescription('Repeat interval in seconds (optional)')))
        .setDefaultMemberPermissions(0), // admin by default

    category: 'admin',

    async execute(interaction) {
        const guildId = interaction.guildId;
        if (!ConfigManager.isCategoryEnabled(guildId, 'admin')) {
            return interaction.reply({ content: 'This category is disabled in this guild.', ephemeral: true });
        }

        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const color = interaction.options.getString('color') || '#2f3136';
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        const embed = new EmbedBuilder().setTitle(title || '').setDescription(description || '').setColor(color);

        const sub = interaction.options.getSubcommand(false);
        if (!sub || sub === 'post') {
            await interaction.reply({ content: `Posting embed to ${channel}`, ephemeral: true });
            await channel.send({ embeds: [embed] });
            return;
        }

        if (sub === 'schedule') {
            const when = interaction.options.getString('when');
            const repeat = interaction.options.getInteger('repeat') || 0;
            const whenTs = Date.parse(when);
            if (isNaN(whenTs)) return interaction.reply({ content: 'Invalid date format for `when`. Use ISO 8601.', ephemeral: true });

            // Get scheduler instance from PlatformManager (attached when bot starts)
            const PlatformManager = require('../../PlatformManager');
            const scheduler = PlatformManager.get('scheduler');
            if (!scheduler) return interaction.reply({ content: 'Scheduler not initialized.', ephemeral: true });

            const job = scheduler.scheduleEmbed(interaction.guildId, channel.id, embed.toJSON(), whenTs, repeat);
            await interaction.reply({ content: `Scheduled embed (id: ${job.id}) at ${new Date(whenTs).toISOString()}`, ephemeral: true });
            return;
        }
    }
};
