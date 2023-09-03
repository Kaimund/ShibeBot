/*
    Mute
    Discord command for server moderators to prevent a current server member from sending messages.
    Copyright (C) 2023 Kaimund
*/

import Discord from 'discord.js';
import { Command } from '../../core/CommandManager';
import { getGuildConfig } from '../../../lib/GuildDirectory';

// Main Function
async function run (interaction: Discord.ChatInputCommandInteraction): Promise<void> {
    return new Promise(async (resolve, reject) => {

        // Import the configuration for the relevant guild
        const guildConfig = await getGuildConfig(interaction.guild.id).catch((err) => {
            return reject(new Error(`Failed to get guild configuration for ${interaction.guild.name}\nReason: ${err}`));
        });
        if (!guildConfig) return;

        // Source Member
        const sourceMember = interaction.member as Discord.GuildMember;

        // Target Member
        const targetMember = interaction.options.getMember('member') as Discord.GuildMember;

        // Time in Minutes
        const timeInMinutes = interaction.options.getInteger('time');

        // Reason
        const reason = interaction.options.getString('reason');

        // Bot has no permission
        if (!interaction.guild.members.me.permissions.has('ModerateMembers')) {
            interaction.reply({content: ':warning: Shibe does not have permission to timeout members.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Target member is higher up than executor
        if (targetMember.roles.highest.position >= sourceMember.roles.highest.position) {
            interaction.reply({content: ':lock: You cannot timeout this member.', ephemeral: false}).catch(() => {});
            return resolve();
        }

        // Member cannot be muted by system
        if (!targetMember.moderatable) {
            interaction.reply({content: ':warning: Shibe cannot timeout this member.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // User is already muted
        if (targetMember.communicationDisabledUntil) {
            interaction.reply({content: ':information_source: This member is already timed out.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Timeout the member
        await targetMember.timeout(timeInMinutes * 60000, reason).catch(error => {return reject(new Error(error));});

        // Convert the time in minutes to a more friendly time description
        let timeText: string;
        switch (timeInMinutes) {
            case 1: timeText = '60 seconds'; break;
            case 5: timeText = '5 minutes'; break;
            case 10: timeText = '10 minutes'; break;
            case 30: timeText = '30 minutes'; break;
            case 60: timeText = '1 hour'; break;
            case 180: timeText = '3 hours'; break;
            case 360: timeText = '6 hours'; break;
            case 720: timeText = '12 hours'; break;
            case 1440: timeText = '1 day'; break;
            case 4320: timeText = '3 days'; break;
            case 10080: timeText = '7 days'; break;
            default: timeText = timeInMinutes.toString() + ' minutes';
        }

        // Try to notify the member over DM that they have been muted
        if (reason) targetMember.user.send(`🔇 You have been timed out on **${interaction.guild.name}** for ${timeText} for the following reason: ${reason}`).catch(() => {});
        else targetMember.user.send(`🔇 You have been timed out on **${interaction.guild.name}** for ${timeText}`).catch(() => {});

        // Report successful mute
        interaction.reply({content: `:white_check_mark: ${targetMember.user.tag} has been timed out for ${timeText}`, ephemeral: true}).catch(() => {});

        // Try logging the incident
        if (guildConfig.actionChannel) {

            const reportEmbed = new Discord.EmbedBuilder()
            .setAuthor({name: 'Timeout', iconURL: interaction.user.avatarURL()})
            .setThumbnail(targetMember.user.avatarURL())
            .setColor('#ff7f00')
            .addFields(
                {name: 'User', value: `<@${targetMember.id}> (${targetMember.user.tag})`},
                {name: 'Moderator', value: `<@${interaction.user.id}> (${interaction.user.tag})`},
                {name: 'Time', value: timeText}
            )
            .setTimestamp()
            .setFooter({text: `Target User ID: ${targetMember.id}`});
            if (reason) reportEmbed.addFields({name: 'Reason', value: reason});

            // Log the incident
            const actionChannel = await interaction.guild.channels.fetch(guildConfig.actionChannel).catch(() => {}) as Discord.TextChannel;
            if (actionChannel) actionChannel.send({embeds: [reportEmbed]}).catch(async () => {
                const reply = await interaction.fetchReply();
                interaction.editReply(reply.content + '\n:warning: Couldn\'t log the incident. Shibe does not have permission to use the logging channel.').catch(() => {});
            }); 
            else {
                const reply = await interaction.fetchReply();
                interaction.editReply(reply.content + '\n:warning: Couldn\'t log the incident. The logging channel no longer exists.').catch(() => {});
            }
        }
        return resolve();
    });

}

// Metadata
export const command = new Command({
    data: {
        name: 'mute',
        description: 'Times out a member so they cannot send messages for a while',
        dmPermission: false,
        defaultMemberPermissions: 'ModerateMembers',
        options: [
            {
                name: 'member',
                description: 'The member to time out',
                type: 6,
                required: true
            },
            {
                name: 'time',
                description: 'How long to timeout someone',
                type: 4,
                required: true,
                choices: [
                    {
                        name: '60 seconds',
                        value: 1
                    },
                    {
                        name: '5 minutes',
                        value: 5
                    },
                    {
                        name: '10 minutes',
                        value: 10
                    },
                    {
                        name: '30 minutes',
                        value: 30
                    },
                    {
                        name: '1 hour',
                        value: 60
                    },
                    {
                        name: '3 hours',
                        value: 180
                    },
                    {
                        name: '6 hours',
                        value: 360
                    },
                    {
                        name: '12 hours',
                        value: 720
                    },
                    {
                        name: '1 day',
                        value: 1440
                    },
                    {
                        name: '3 days',
                        value: 4320
                    },
                    {
                        name: '7 days',
                        value: 10080
                    }
                ]
            },
            {
                name: 'reason',
                description: 'The reason for the timeout',
                type: 3,
                required: false
            }
        ]
    },
    run: run
});
