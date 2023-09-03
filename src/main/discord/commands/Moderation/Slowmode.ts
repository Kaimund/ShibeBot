/*
    Slowmode
    Discord command for moderators to restrict how often members can send messages in a channel.
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

        // Bot has no permission
        if (!interaction.guild.members.me.permissions.has('ManageChannels')) {
            interaction.reply({content: ':warning: Shibe does not have permission to manage slowmode. This requires Shibe to have the __Manage Channels__ permission.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Check that the inputted time argument is valid and between 0 and 21600 seconds (the allowed range by Discord)
        const timeInSeconds = interaction.options.getInteger('time');

        // Actually set slowmode
        await interaction.channel.setRateLimitPerUser(timeInSeconds).catch(error => {return reject(error);});

        // Report success
        (timeInSeconds > 0) ? interaction.reply(`:white_check_mark: Slowmode has been set to ${timeInSeconds.toString()} seconds.`).catch(() => {}) : interaction.reply(':white_check_mark: Slowmode has been disabled.').catch(() => {});
        return resolve();
    });
}

// Metadata
export const command = new Command({
    data: {
        name: 'slowmode',
        description: 'Keeps the calm in a channel by forcing members to wait between each message they send.',
        dmPermission: false,
        defaultMemberPermissions: 'ManageMessages',
        options: [
            {
                name: 'time',
                description: 'The time in seconds to set the channel\'s slowmode to',
                type: 4,
                required: true,
                min_value: 0,
                max_value: 21600
            }
        ]
    },
    run: run
});
