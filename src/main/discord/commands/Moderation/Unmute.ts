/*
    Unmute
    Discord command for moderators to revoke an existing member's mute.
    Copyright (C) 2023 Kaimund
*/ 

import Discord from 'discord.js';
import { Command } from '../../core/CommandManager';
import { getGuildConfig } from '../../../helpers/GuildDirectory';

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

        // Bot has no permission
        if (!interaction.guild.members.me.permissions.has('ModerateMembers')) {
            interaction.reply({content: ':warning: Shibe does not have permission to remove timeouts from members.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Target member is higher up than executor
        if (targetMember.roles.highest.position >= sourceMember.roles.highest.position) {
            interaction.reply({content: ':lock: You cannot timeout this member.', ephemeral: false}).catch(() => {});
            return resolve();
        }

        // Member cannot be unmuted by system
        if (!targetMember.moderatable) {
            interaction.reply({content: ':warning: Shibe cannot timeout this member.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Member is not muted
        if (!targetMember.communicationDisabledUntil) {
            interaction.reply({content: ':information_source: This member is not timed out.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Acually unmute the member
        await targetMember.timeout(null).catch(error => {return reject(new Error(error));});

        // Try to contact the member over DM to notify of unmute
        targetMember.user.send(`🔊 Your timeout on **${interaction.guild.name}** has been revoked.`).catch(() => {});
        interaction.reply({content: `:white_check_mark: ${targetMember.user.tag} has been unmuted.`, ephemeral: true}).catch(() => {});

        // Try logging the incident
        if (guildConfig.actionChannel) {

            const reportEmbed = new Discord.EmbedBuilder()
            .setAuthor({name: 'Timeout Revoked', iconURL: interaction.user.avatarURL()})
            .setThumbnail(targetMember.user.avatarURL())
            .setColor('#00ff7f')
            .addFields(
                {name: 'User', value: `<@${targetMember.id}> (${targetMember.user.tag})`},
                {name: 'Moderator', value: `<@${interaction.user.id}> (${interaction.user.tag})`}
            )
            .setTimestamp()
            .setFooter({text: `Target User ID: ${targetMember.id}`});

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
        name: 'unmute',
        description: 'Revokes an active mute from a member.',
        dmPermission: false,
        defaultMemberPermissions: 'ModerateMembers',
        options: [
            {
                name: 'member',
                description: 'The member to remove the timeout from',
                type: 6,
                required: true
            }
        ]
    },
    run: run
});
