/*
    Warn
    Discord command for moderators to anonymously warn a server member while logging the event in the server's action channel.
    Copyright (C) 2023 Kaimund
*/ 

import Discord from 'discord.js';
import sql from '../../../lib/SQL';
import AppLog from '../../../lib/AppLog';
import { Command } from '../../core/CommandManager';
import { getGuildConfig } from '../../../lib/GuildDirectory';

// Main Function
async function run (interaction: Discord.ChatInputCommandInteraction): Promise<void> {
    return new Promise(async (resolve) => {

        // Import the configuration for the relevant guild
        const guildData = await getGuildConfig(interaction.guild.id).catch(() => {});

        // Source Member
        const sourceMember = interaction.member as Discord.GuildMember;

        // Target Member
        const targetMember = interaction.options.getMember('member') as Discord.GuildMember;

        // Warn Reason
        const reason = interaction.options.getString('reason');

        // Log the incident to the Shibe database
        const eventID = Discord.SnowflakeUtil.generate();

        // Try to warn over DM
        await targetMember.user.send(`⚠️ You were warned on **${interaction.guild.name}** for the following reason: ${reason}`)
        .then(async () => {
            if (guildData) await interaction.reply({content: `:white_check_mark: ${targetMember.user.tag} has been warned.`, ephemeral: true}).catch(() => {});
            else await interaction.reply({content: `:white_check_mark: ${targetMember.user.tag} has been warned.\n:warning: Cannot log this incident due to a temporary service issue.`, ephemeral: true}).catch(() => {});
        })
        .catch(async () => {
            if (guildData) {
                if (guildData.actionChannel) await interaction.reply({content: ':warning: Unable to contact the target member. This incident will still be logged.', ephemeral: true}).catch(() => {});
                else await interaction.reply({content: ':warning: Unable to contact the target member.', ephemeral: true}).catch(() => {});
            } else await interaction.reply({content: ':warning: Unable to contact the target member.\n:warning: Cannot log this incident due to a temporary service issue.', ephemeral: true}).catch(() => {});
        });

        // Log the new event to the database
        await sql.query(`INSERT INTO ModActions VALUES ('${eventID}', '${interaction.guild.id}', '${targetMember.id}', '${sourceMember.id}', 'WARN', '${new Date().getTime()}', NULL, '${sql.sanitize(reason)}', 'ACTIVE', NULL, NULL)`).catch(async (error) => {
            AppLog.error(error, 'Logging warning to database');
        });

        // Try logging the incident
        if (guildData) {
            if (guildData.actionChannel) {
                const reportEmbed = new Discord.EmbedBuilder()
                .setAuthor({name: 'Warn', iconURL: interaction.user.avatarURL()})
                .setThumbnail(targetMember.user.avatarURL())
                .setColor('#ffeb00')
                .addFields(
                    {name: 'User', value: `<@${targetMember.id}> (${targetMember.user.tag})`},
                    {name: 'Moderator', value: `<@${interaction.user.id}> (${interaction.user.tag})`},
                    {name: 'Reason', value: reason}
                )
                .setTimestamp()
                .setFooter({text: `Event ID: ${eventID}`});
    
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
        name: 'warn',
        description: 'Warns a target user via the bot with a message and logs the incident (where availble)',
        dmPermission: false,
        defaultMemberPermissions: 'ManageMessages',
        options: [
            {
                name: 'member',
                description: 'The member you would like to warn',
                type: 6,
                required: true
            },
            {
                name: 'reason',
                description: 'The reason for warning this member',
                type: 3,
                required: true
            }
        ]
    },
    run: run
});
