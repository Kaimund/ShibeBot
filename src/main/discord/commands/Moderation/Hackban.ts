/*
    Hackban
    Discord command for server moderators to prohibit a non-member Discord user from joining a server.
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

        // Target User ID
        const userToBan = interaction.options.getString('userid');

        // Bot has no permission
        if (!interaction.guild.members.me.permissions.has('BanMembers')) {
            interaction.reply({content: ':warning: Shibe does not have permission to ban members.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Ban Reason
        const banReason = interaction.options.getString('reason');

        // Actually ban the member
        if (banReason) {
            await interaction.guild.members.ban(userToBan, {
                reason: banReason,
                deleteMessageSeconds: 24*60*60
            })
            .then(async () => {
                await interaction.reply({content: ':white_check_mark: Ban successful.', ephemeral: true}).catch(() => {});
            })
            .catch(async () => await interaction.reply({content: ':warning: Ban request failed. You may not have specified a valid user ID.', ephemeral: true}).catch(() => {}));
        } else {
            await interaction.guild.members.ban(userToBan, {
                deleteMessageSeconds: 24*60*60
            })
            .then(async () => {
                await interaction.reply({content: ':white_check_mark: Ban successful.', ephemeral: true}).catch(() => {});
            })
            .catch(async () => await interaction.reply({content: ':warning: Ban request failed. You may not have specified a valid user ID.', ephemeral: true}).catch(() => {}));
        }
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
