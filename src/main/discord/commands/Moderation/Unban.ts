/*
    Unban
    Discord command for server moderators to unban a user from joining a server.
    Copyright (C) 2023 Kaimund
*/

import Discord from 'discord.js';
import sql from '../../../lib/SQL';
import AppLog from '../../../lib/AppLog';
import { Command } from '../../core/CommandManager';
import { EventEntry } from '../../lib/ModerationTimer';
import { getUserConfig } from '../../../lib/UserDirectory';
import { getGuildConfig } from '../../../lib/GuildDirectory';

// Main Function
async function run (interaction: Discord.ChatInputCommandInteraction): Promise<void> {
    return new Promise(async (resolve, reject) => {

        // Import the configuration for the relevant guild
        const guildData = await getGuildConfig(interaction.guild.id).catch(() => {});

        // Source Member
        const sourceMember = interaction.member as Discord.GuildMember;

        // Target User
        const targetUser = interaction.options.getUser('user') as Discord.User;

        // Reason
        const reason = interaction.options.getString('reason');

        // Bot has no permission
        if (!interaction.guild.members.me.permissions.has('BanMembers')) {
            interaction.reply({content: ':warning: Shibe does not have permission to unban users.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Create user data in the database if they do not exist
        await getUserConfig(sourceMember.id, interaction.client).catch(() => {});
        await getUserConfig(targetUser.id, interaction.client).catch(() => {});

        // Lookup Ban List
        const serverBans = await interaction.guild.bans.fetch().catch(error => {return reject(error);});
        if (!serverBans) return;

        // Check to see if the user is actually banned
        if (!serverBans.has(targetUser.id)) {
            await interaction.reply({content: ':information_source: This user is not currently banned.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Acually unban the user
        await interaction.guild.members.unban(targetUser.id).catch(error => {return reject(error);});

        // Try to notify the member that they have been unbanned
        if (reason) await targetUser.send(`✅ You have been unbanned from **${interaction.guild.name}** for the following reason: ${reason}`).catch(() => {});
        else await targetUser.send(`✅ You have been unbanned from **${interaction.guild.name}**.`).catch(() => {});

        // Report successful unban
        await interaction.reply({content: `:white_check_mark: ${targetUser.tag} has been unbanned from the server.`, ephemeral: true}).catch(() => {});

        // Try to find the latest event (for logging, if there is an action channel set on the server)
        let eventID: bigint;
        if (guildData) {
            if (guildData.actionChannel) {
                const activeBans = await sql.query(`SELECT * FROM ModActions WHERE guildID = '${interaction.guild.id}' AND userID = '${targetUser.id}' AND action = 'BAN' AND (status = 'ACTIVE' OR status = 'APPEALED' OR status = 'DENIED')`).catch((error) => {
                    AppLog.error(error, 'Unban command - getting latest ban event ID');
                }) as void | Array<EventEntry>;
    
                // Go through each event and find which one is the most recent - this will be the event ID in the report
                if (activeBans) {
                    activeBans.forEach(event => {
                        if (!eventID || eventID < event.eventID) eventID = event.eventID;
                    });
                }
            }
        }

        // Mark all current bans as 'REVOKED'
        await sql.query(`UPDATE ModActions SET status = 'REVOKED' WHERE guildID = '${interaction.guild.id}' AND userID = '${targetUser.id}' AND action = 'BAN' AND (status = 'ACTIVE' OR status = 'APPEALED' OR status = 'DENIED')`).catch(async (error) => {
            AppLog.error(error, 'Unban command - revoking bans');
            const reply = await interaction.fetchReply().catch(() => {});
            if (reply) interaction.editReply(reply.content + '\n:warning: Couldn\'t log this incident due to a temporary issue.').catch(() => {});
        });

        // Try logging the incident to the action channel
        if (guildData) {
            if (guildData.actionChannel) {
                const reportEmbed = new Discord.EmbedBuilder()
                .setAuthor({
                    name: 'Unban', 
                    iconURL: interaction.user.avatarURL()
                })
                .setThumbnail(targetUser.avatarURL())
                .setColor('#00d2ef')
                .addFields(
                    {name: 'User', value: `<@${targetUser.id}> (${targetUser.tag})`},
                    {name: 'Moderator', value: `<@${interaction.user.id}> (${interaction.user.tag})`},
                )
                .setTimestamp();
                
                if (eventID) reportEmbed.setFooter({text: `Event ID: ${eventID}`});
                if (reason) reportEmbed.addFields({name: 'Reason', value: reason});
    
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
        return resolve();
    });
}

// Metadata
export const command = new Command({
    data: {
        name: 'unban',
        description: 'Unbans a user from joining the server',
        dmPermission: false,
        defaultMemberPermissions: 'BanMembers',
        options: [
            {
                name: 'user',
                description: 'The user you would like to unban',
                type: 6,
                required: true
            },
            {
                name: 'reason',
                description: 'The reason for unbanning the user',
                type: 3,
                required: false
            }
        ]
    },
    run: run
});
