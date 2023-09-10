/*
    Hackban
    Discord command for server moderators to prohibit a non-member Discord user from joining a server.
    Copyright (C) 2023 Kaimund
*/

import Discord from 'discord.js';
import sql from '../../../lib/SQL';
import AppLog from '../../../lib/AppLog';
import { Command } from '../../core/CommandManager';
import { getUserConfig } from '../../../lib/UserDirectory';
import { getGuildConfig } from '../../../lib/GuildDirectory';

// Main Function
async function run (interaction: Discord.ChatInputCommandInteraction): Promise<void> {
    return new Promise(async (resolve) => {

        // Import the configuration for the relevant guild
        const guildData = await getGuildConfig(interaction.guild.id).catch(() => {});

        // Source Member
        const sourceMember = interaction.member as Discord.GuildMember;

        // Target User ID
        const userToBan = interaction.options.getString('userid');

        // Ban Reason
        const reason = interaction.options.getString('reason');

        // Bot has no permission
        if (!interaction.guild.members.me.permissions.has('BanMembers')) {
            interaction.reply({content: ':warning: Shibe does not have permission to ban members.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Create user data in the database if they do not exist
        const targetUserData = await getUserConfig(userToBan, interaction.client).catch(() => {});

        // Actually ban the member
        await interaction.guild.members.ban(userToBan, {
            reason: reason,
            deleteMessageSeconds: 24*60*60
        })
        .then(async () => {
            // The hackban was successful. Report it.
            await interaction.reply({content: ':white_check_mark: Ban successful.', ephemeral: true}).catch(() => {});

            // Log the incident to the Shibe database
            const eventID = Discord.SnowflakeUtil.generate();

            // Log the event to the database
            await sql.query(`INSERT INTO ModActions VALUES ('${eventID}', '${interaction.guild.id}', '${sql.sanitize(userToBan)}', '${sourceMember.id}', 'BAN', '${new Date().getTime()}', '', '${sql.sanitize(reason)}', 'ACTIVE', NULL, NULL)`).catch(async (error) => {
                AppLog.error(error, 'Logging hackban to database');
                const reply = await interaction.fetchReply().catch(() => {});
                if (reply) await interaction.editReply(reply.content + '\n:warning: Couldn\'t log this incident due to a temporary issue.').catch(() => {});
            });

            // Try logging the incident to the action channel
            if (guildData) {
                if (guildData.actionChannel) {

                    let userText = `<@${userToBan}>`;
                    if (targetUserData) {
                        if (targetUserData.username) {
                            userText = `<@${userToBan}> (${targetUserData.username})`;
                        }
                    }
    
                    const reportEmbed = new Discord.EmbedBuilder()
                    .setAuthor({
                        name: 'Ban (Hackban)', 
                        iconURL: interaction.user.avatarURL()
                    })
                    .setColor('#800000')
                    .addFields(
                        {name: 'User', value: userText},
                        {name: 'Moderator', value: `<@${interaction.user.id}> (${interaction.user.tag})`},
                    )
                    .setTimestamp()
                    .setFooter({text: `Event ID: ${eventID}`});
                    if (reason) reportEmbed.addFields({name: 'Reason', value: reason});
                    if (targetUserData) {
                        if (targetUserData.avatarURL) reportEmbed.setThumbnail(targetUserData.avatarURL);
                    }
    
                    // Log the incident
                    const actionChannel = await interaction.guild.channels.fetch(guildData.actionChannel).catch(() => {}) as Discord.TextChannel;
                    if (actionChannel) actionChannel.send({embeds: [reportEmbed]}).catch(async () => {
                        const reply = await interaction.fetchReply().catch(() => {});
                        if (reply) interaction.editReply(reply.content + '\n:warning: Couldn\'t log the incident. Shibe does not have permission to use the logging channel.').catch(() => {});
                    });
                    else {
                        const reply = await interaction.fetchReply().catch(() => {});
                        if (reply) interaction.editReply(reply.content + '\n:warning: Couldn\'t log the incident. The logging channel no longer exists.').catch(() => {});
                    }
                }
            }
        })
        .catch(async () => {
            // The hackban failed. Explain why this may have happened.
            await interaction.reply({content: ':warning: Ban request failed. This may be because:\n1. You may not have specified a valid user ID.\n2. You do not have permission to ban this user.\n3. Shibe does not have permission to ban this user.', ephemeral: true}).catch(() => {});
        });

        return resolve();
    });
}

// Metadata
export const command = new Command({
    data: {
        name: 'hackban',
        description: 'Prohibits a user from joining the server based on their User ID',
        dmPermission: false,
        defaultMemberPermissions: 'BanMembers',
        options: [
            {
                name: 'userid',
                description: 'The ID of the user to ban',
                type: 3,
                required: true
            },
            {
                name: 'reason',
                description: 'Specify a reason for banning this account',
                type: 3,
                required: false
            }
        ]
    },
    run: run
});
