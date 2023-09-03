/*
    Kick
    Discord command for server moderators to forcefully remove a member from a server.
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

        // Warn Reason
        const reason = interaction.options.getString('reason');

        // Bot has no permission
        if (!interaction.guild.members.me.permissions.has('KickMembers')) {
            interaction.reply({content: ':warning: Shibe does not have permission to kick members.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Target member is higher up than executor
        if (targetMember.roles.highest.position >= sourceMember.roles.highest.position) {
            interaction.reply({content: ':lock: You cannot kick this member.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Target member not kickable by system
        if (!targetMember.kickable) {
            interaction.reply({content: ':warning: Shibe cannot kick this member.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Everything checks out. Now try to kick the member.
        if (reason) {
            await targetMember.user.send(`:x: You were kicked from **${interaction.guild.name}** for the following reason: ${reason}`).catch(() => {});
            await targetMember.kick(reason).catch(error => {return reject(error);});
        } else {
            await targetMember.user.send(`:x: You were kicked from **${interaction.guild.name}**.`).catch(() => {});
            await targetMember.kick().catch(error => {return reject(error);});
        }

        // Report the success
        interaction.reply({content: `:white_check_mark: ${targetMember.user.tag} was kicked from the server.`, ephemeral: true}).catch(() => {});

        // Try logging the incident
        if (guildConfig.actionChannel) {

            const reportEmbed = new Discord.EmbedBuilder()
            .setAuthor({name: 'Kick', iconURL: interaction.user.avatarURL()})
            .setThumbnail(targetMember.user.avatarURL())
            .setColor('#ff0000')
            .addFields(
                {name: 'User', value: `<@${targetMember.id}> (${targetMember.user.tag})`},
                {name: 'Moderator', value: `<@${interaction.user.id}> (${interaction.user.tag})`}
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
        name: 'kick',
        description: 'Forcefully remove a member from the server.',
        dmPermission: false,
        defaultMemberPermissions: 'KickMembers',
        options: [
            {
                name: 'member',
                description: 'The member you would like to kick',
                type: 6,
                required: true
            },
            {
                name: 'reason',
                description: 'The reason for kicking the member',
                type: 3,
                required: false
            }
        ]
    },
    run: run
});
