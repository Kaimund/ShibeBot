/*
    Invite
    Discord command to produce an invite link to add the bot to a user's own server.
    Copyright (C) 2023 Kaimund
*/ 

import Discord from 'discord.js';
import { Command } from '../../core/CommandManager';
import { getSystemConfig } from '../../../lib/SystemDirectory';

// Main Function
async function run (interaction: Discord.ChatInputCommandInteraction): Promise<void> {
    return new Promise(async (resolve) => {
        const systemConfig = getSystemConfig();

        (systemConfig.webInfo.inviteURL) ? interaction.reply({content: 'Here\'s an invite link to add me to your server: ' + systemConfig.webInfo.inviteURL, ephemeral: true}).catch(() => {}) : interaction.reply({content: ':information_source: This bot instance has not been made public.', ephemeral: true}).catch(() => {});
        return resolve();
    });
}

// Metadata
export const command = new Command({
    data: {
        name: 'invite',
        description: 'Add the bot to your own server.'
    },
    run: run
});
