/*
    Warn
    Discord command for moderators to anonymously warn a server member while logging the event in the server's action channel.
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

        // Find Member
        const targetMember = interaction.options.getMember('member') as Discord.GuildMember;

        // Warn Reason
        const reason = interaction.options.getString('reason');

        // Try to warn over DM
        await targetMember.user.send(`⚠️ You were warned on **${interaction.guild.name}** for the following reason: ${reason}`)
        .then(() => interaction.reply({content: `:white_check_mark: ${targetMember.user.tag} has been warned.`, ephemeral: true}).catch(() => {}))
        .catch(() => {
            guildConfig.actionChannel ? interaction.reply({content: ':warning: Unable to contact the target member. This incident will still be logged.', ephemeral: true}).catch(() => {}) : interaction.reply({content: ':warning: Unable to contact the target member.', ephemeral: true}).catch(() => {});
        });

        // Try logging the incident
        if (guildConfig.actionChannel){

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
