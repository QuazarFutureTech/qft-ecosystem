const { SlashCommandBuilder } = require('discord.js');
const Tickets = require('../../modules/tickets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket management')
        .addSubcommand(sc => sc.setName('create').setDescription('Create a support ticket')
            .addStringOption(o => o.setName('reason').setDescription('Reason for ticket')))
        .addSubcommand(sc => sc.setName('close').setDescription('Close a ticket in this channel')),

    category: 'tickets',

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'create') {
            await interaction.deferReply({ ephemeral: true });
            const reason = interaction.options.getString('reason') || '';
            const rec = await Tickets.createTicket(interaction.guild, interaction.member, reason);
            await interaction.followUp({ content: `Ticket created: <#${rec.id}>`, ephemeral: true });
        } else if (sub === 'close') {
            // try closing the current channel
            const chan = interaction.channel;
            const res = await Tickets.closeTicket(chan, interaction.user.id);
            if (res) await interaction.reply({ content: 'Ticket closed and transcript exported.', ephemeral: true });
            else await interaction.reply({ content: 'This channel is not an open ticket.', ephemeral: true });
        }
    }
};
