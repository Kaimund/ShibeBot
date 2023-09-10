/*
    Report
    Discord command for users to raise a concern to moderators by sending an alert to the server action logging channel.
    Copyright (C) 2023 Kaimund
*/ 

import Discord from 'discord.js';
import { Command } from '../../core/CommandManager';
import { getGuildConfig } from '../../../lib/GuildDirectory';

// Main Function
async function run (interaction: Discord.ChatInputCommandInteraction): Promise<void> {
    return new Promise(async (resolve) => {

        // Import the configuration for the relevant guild
        const guildData = await getGuildConfig(interaction.guild.id).catch(() => {});

        // Do not continue if fetching guild data fails
        if (!guildData) {
            interaction.reply({content: ':warning: Shibe could not submit your report due to a temporary service issue. Please contact a moderator in person, or try again later.', ephemeral: true});
            return resolve();
        }

        // Target Member
        const targetMember = interaction.options.getMember('member') as Discord.GuildMember;

        // Warn Reason
        const reason = interaction.options.getString('reason');

        // No Action Channel
        if (!guildData.actionChannel) {
            interaction.reply({content: ':information_source: Reporting hasn\'t been configured on this server. Please contact a moderator directly if you would like to report a member.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Prepare the Report Embed
        const reportEmbed = new Discord.EmbedBuilder()
        .setAuthor({name: 'Report', iconURL: interaction.user.avatarURL()})
        .setThumbnail(targetMember.user.avatarURL())
        .setColor('#ff2c9e')
        .addFields(
            {name: 'From', value: `<@${interaction.user.id}> (${interaction.user.tag})`},
            {name: 'Regarding', value: `<@${targetMember.id}> (${targetMember.user.tag})`},
            {name: 'Reason', value: reason}
        )
        .setTimestamp()
        .setFooter({text: `Target User ID: ${targetMember.id}`});

        // Get the Channel for Reporting
        const actionChannel = await interaction.guild.channels.fetch(guildData.actionChannel).catch(() => {}) as Discord.TextChannel;

        // If the channel cannot be found, it has been deleted. Cancel the report and warn of this.
        if (!actionChannel) {
            interaction.reply({content: ':warning: There was a problem submitting your report. The channel for receiving reports no longer exists. Please contact a moderator in person, and report this issue to a server admin.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Actually submit the report
        actionChannel.send({embeds: [reportEmbed]})
        .then(async () => interaction.reply({content: ':white_check_mark: Thank you. Your report has been received.', ephemeral: true}).catch(() => {}))
        .catch(async () => interaction.reply({content: ':warning: There was a problem submitting your report. Please contact a moderator in person.', ephemeral: true}).catch(() => {}));
        
        return resolve();
    });
}

// Metadata
export const command = new Command({
    data: {
        name: 'report',
        description: 'Report a member to the moderators',
        dmPermission: false,
        options: [
            {
                name: 'member',
                description: 'The member you would like to report',
                type: 6,
                required: true
            },
            {
                name: 'reason',
                description: 'The reason for your report',
                type: 3,
                required: true
            }
        ]
    },
    run: run
});
