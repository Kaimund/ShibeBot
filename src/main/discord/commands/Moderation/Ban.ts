/*
    Ban
    Discord command for server moderators to prohibit a current member from joining a server.
    Copyright (C) 2023 Kaimund
*/

import sql from '../../../lib/SQL';
import Discord from 'discord.js';
import AppLog from '../../../lib/AppLog';
import { Command } from '../../core/CommandManager';
import { getUserConfig } from '../../../lib/UserDirectory';
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

        // Cannot find member
        if (!targetMember) {
            interaction.reply({content: ':information_source: Shibe cannot find the target member. If you know the user ID of the person you would like to ban, use the `/hackban` command instead.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Bot has no permission
        if (!interaction.guild.members.me.permissions.has('BanMembers')) {
            interaction.reply({content: ':warning: Shibe does not have permission to ban members.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Target member is higher up than executor
        if (targetMember.roles.highest.position >= sourceMember.roles.highest.position) {
            interaction.reply({content: ':lock: You cannot ban this member.', ephemeral: true}).catch(() => {});
            return resolve();
        }
        // Target member not bannable by system
        if (!targetMember.bannable) {
            interaction.reply({content: ':warning: Shibe cannot ban this member.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Convert the time in minutes to a more friendly time description
        let timeText: string;
        if (timeInMinutes) {
            switch (timeInMinutes) {
                case 1440: timeText = '1 day'; break;
                case 4320: timeText = '3 days'; break;
                case 10080: timeText = '7 days'; break;
                case 20160: timeText = '14 days'; break;
                case 43200: timeText = '30 days'; break;
                case 86400: timeText = '60 days'; break;
                case 129600: timeText = '90 days'; break;
                case 259200: timeText = '180 days'; break;
                case 525600: timeText = '1 year'; break;
                default: timeText = timeInMinutes.toString() + ' minutes';
            }
        }

        // Create user data in the database if they do not exist
        await getUserConfig(sourceMember.id, interaction.client).catch(() => {});
        await getUserConfig(targetMember.id, interaction.client).catch(() => {});

        // Try to notify the member that they have been banned (only if they're already in the server)
        if (reason && timeInMinutes) await targetMember.send(`⛔ You have been banned from **${interaction.guild.name}** for ${timeText} for the following reason: ${reason}`).catch(() => {});
        else if (reason) await targetMember.send(`⛔ You have been banned from **${interaction.guild.name}** for the following reason: ${reason}`).catch(() => {});
        else if (timeInMinutes) await targetMember.send(`⛔ You have been banned from **${interaction.guild.name}** for ${timeText}`).catch(() => {});
        else await targetMember.send(`⛔ You have been banned from **${interaction.guild.name}**.`).catch(() => {});

        // Actually ban the member
        if (reason) {
            interaction.guild.members.ban(targetMember, {
                reason: reason,
                deleteMessageSeconds: 24*60*60
            }).catch(error => {return reject(new Error(error));});
        } else {
            interaction.guild.members.ban(targetMember, {
                deleteMessageSeconds: 24*60*60
            }).catch(error => {return reject(new Error(error));});
        }

        // Report successful ban
        timeInMinutes ? await interaction.reply({content: `:white_check_mark: ${targetMember.user.tag} has been banned from the server for ${timeText}`, ephemeral: true}).catch(() => {}) : await interaction.reply({content: `:white_check_mark: ${targetMember.user.tag} has been banned from the server.`, ephemeral: true}).catch(() => {});

        // Log the incident to the Shibe database
        const eventID = Discord.SnowflakeUtil.generate();

        // Log the event to the database
        const expiry = (timeInMinutes) ? new Date().getTime() + (timeInMinutes * 60000) : null;
        await sql.query(`INSERT INTO ModActions VALUES ('${eventID}', '${interaction.guild.id}', '${targetMember.id}', '${sourceMember.id}', 'BAN', '${new Date().getTime()}', '${expiry}', '${sql.sanitize(reason)}', 'ACTIVE', NULL, NULL)`).catch(async (error) => {
            AppLog.error(error, 'Logging ban to database');
            const reply = await interaction.fetchReply();
            interaction.editReply(reply.content + '\n:warning: Couldn\'t log the incident to the Shibe database due to a temporary issue. This ban will not expire!').catch(() => {});
        });

        // Try logging the incident to the action channel
        if (guildConfig.actionChannel) {
            const reportEmbed = new Discord.EmbedBuilder()
            .setAuthor({
                name: 'Ban', 
                iconURL: interaction.user.avatarURL()
            })
            .setThumbnail(targetMember.user.avatarURL())
            .setColor('#800000')
            .addFields(
                {name: 'User', value: `<@${targetMember.id}> (${targetMember.user.tag})`},
                {name: 'Moderator', value: `<@${interaction.user.id}> (${interaction.user.tag})`},
            )
            .setTimestamp()
            .setFooter({text: `Event ID: ${eventID}`});
            if (timeInMinutes) reportEmbed.addFields({name: 'Time', value: timeText});
            if (reason) reportEmbed.addFields({name: 'Reason', value: reason});

            // Log the incident
            const actionChannel = await interaction.guild.channels.fetch(guildConfig.actionChannel).catch(() => {}) as Discord.TextChannel;
            if (actionChannel) actionChannel.send({embeds: [reportEmbed]}).catch(async () => {
                const reply = await interaction.fetchReply().catch(() => {});
                if (reply) interaction.editReply(reply.content + '\n:warning: Couldn\'t log the incident. Shibe does not have permission to use the logging channel.').catch(() => {});
            }); 
            else {
                const reply = await interaction.fetchReply().catch(() => {});
                if (reply) interaction.editReply(reply.content + '\n:warning: Couldn\'t log the incident. The logging channel no longer exists.').catch(() => {});
            }
        }
        return resolve();
    });
}

// Metadata
export const command = new Command({
    data: {
        name: 'ban',
        description: 'Prohibits a user from joining the server',
        dmPermission: false,
        defaultMemberPermissions: 'BanMembers',
        options: [
            {
                name: 'member',
                description: 'The member you would like to ban',
                type: 6,
                required: true
            },
            {
                name: 'time',
                description: 'How long to ban the user',
                type: 4,
                required: false,
                choices: [
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
                    },
                    {
                        name: '14 days',
                        value: 20160,
                    },
                    {
                        name: '30 days',
                        value: 43200,
                    },
                    {
                        name: '60 days',
                        value: 86400,
                    },
                    {
                        name: '90 days',
                        value: 129600,
                    },
                    {
                        name: '180 days',
                        value: 259200,
                    },
                    {
                        name: '1 year',
                        value: 525600,
                    },
                ]
            },
            {
                name: 'reason',
                description: 'The reason for the ban',
                type: 3,
                required: false
            }
        ]
    },
    run: run
});
