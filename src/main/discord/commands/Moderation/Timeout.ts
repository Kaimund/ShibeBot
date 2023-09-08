/*
    Timeout
    Discord command for server moderators to prevent a current server member from sending messages.
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
        const guildData = await getGuildConfig(interaction.guild.id).catch((err) => {
            return reject(new Error(`Failed to get guild configuration for ${interaction.guild.name}\nReason: ${err}`));
        });
        if (!guildData) return;

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

        // User is not timed out and trying to revoke a timeout
        if (!targetMember.isCommunicationDisabled() && timeInMinutes === 0) {
            interaction.reply({content: ':information_source: This member is not timed out.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Log the incident to the Shibe database
        const eventID = Discord.SnowflakeUtil.generate();

        // Create user data in the database if they do not exist
        await getUserConfig(sourceMember.id).catch(() => {});
        await getUserConfig(targetMember.id).catch(() => {});

        if (timeInMinutes) {
            // Timeout the member
            await targetMember.timeout(timeInMinutes * 60000, reason).catch(error => {return reject(new Error(error));});

            // Mark all current timeouts as 'REVOKED' as this overrides any outstanding timeouts
            await sql.query(`UPDATE ModActions SET status = 'REVOKED' WHERE guildID = '${interaction.guild.id}' AND userID = '${targetMember.id}' AND action = 'TIMEOUT' AND (status = 'ACTIVE' OR status = 'APPEALED' OR status = 'DENIED')`).catch((error) => {
                AppLog.error(error, 'Logging timeout to database (revoke existing)');
            });

            // Log the new event to the database
            await sql.query(`INSERT INTO ModActions VALUES ('${eventID}', '${interaction.guild.id}', '${targetMember.id}', '${sourceMember.id}', 'TIMEOUT', '${new Date().getTime()}', '${new Date().getTime() + (timeInMinutes * 60000)}', '${sql.sanitize(reason)}', 'ACTIVE')`).catch(async (error) => {
                AppLog.error(error, 'Logging timeout to database');
                const reply = await interaction.fetchReply();
                interaction.editReply(reply.content + '\n:warning: Couldn\'t log the incident to the Shibe database due to a temporary issue.').catch(() => {});
            });

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
            if (guildData.actionChannel) {

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
                .setFooter({text: `Event ID: ${eventID}`});
                if (reason) reportEmbed.addFields({name: 'Reason', value: reason});

                // Log the incident
                const actionChannel = await interaction.guild.channels.fetch(guildData.actionChannel).catch(() => {}) as Discord.TextChannel;
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
        } else {
            // Try to find the latest event (for logging, if there is an action channel set on the server)
            let eventID: bigint;
            if (guildData.actionChannel) {
                const activeTimeouts = await sql.query(`SELECT * FROM ModActions WHERE guildID = '${interaction.guild.id}' AND userID = '${targetMember.id}' AND action = 'TIMEOUT' AND (status = 'ACTIVE' OR status = 'APPEALED' OR status = 'DENIED')`).catch((error) => {
                    AppLog.error(error, 'Logging timeout command - revoked timeout (get latest event ID)');
                }) as void | Array<EventEntry>;

                // Go through each event and find which one is the most recent - this will be the event ID in the report
                if (activeTimeouts) {
                    activeTimeouts.forEach(event => {
                        if (!eventID || eventID < event.eventID) eventID = event.eventID;
                    });
                }
            }

            // Mark all current timeouts as 'REVOKED' as this overrides any outstanding timeouts
            await sql.query(`UPDATE ModActions SET status = 'REVOKED' WHERE guildID = '${interaction.guild.id}' AND userID = '${targetMember.id}' AND action = 'TIMEOUT' AND (status = 'ACTIVE' OR status = 'APPEALED' OR status = 'DENIED')`).catch((error) => {
                AppLog.error(error, 'Logging timeout to database (revoke existing)');
            });

            // Remove the timeout on the member
            await targetMember.timeout(null).catch(error => {return reject(new Error(error));});

            // Try to contact the member over DM to notify of unmute
            targetMember.user.send(`🔊 Your timeout on **${interaction.guild.name}** has been revoked.`).catch(() => {});
            interaction.reply({content: `:white_check_mark: ${targetMember.user.tag} is no longer timed out.`, ephemeral: true}).catch(() => {});

            // Try logging the incident
            if (guildData.actionChannel) {

                const reportEmbed = new Discord.EmbedBuilder()
                .setAuthor({name: 'Timeout Revoked', iconURL: interaction.user.avatarURL()})
                .setThumbnail(targetMember.user.avatarURL())
                .setColor('#00ff7f')
                .addFields(
                    {name: 'User', value: `<@${targetMember.id}> (${targetMember.user.tag})`},
                    {name: 'Moderator', value: `<@${interaction.user.id}> (${interaction.user.tag})`}
                )
                .setTimestamp();

                if (reason) reportEmbed.addFields({name: 'Reason', value: reason});
                if (eventID) reportEmbed.setFooter({text: `Event ID: ${eventID}`});
                
                // Log the incident
                const actionChannel = await interaction.guild.channels.fetch(guildData.actionChannel).catch(() => {}) as Discord.TextChannel;
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
        }
    });

}

// Metadata
export const command = new Command({
    data: {
        name: 'timeout',
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
                        name: 'Revoke',
                        value: 0
                    },
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
