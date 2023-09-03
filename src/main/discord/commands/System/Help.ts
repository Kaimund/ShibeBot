/*
    Help
    Discord command for users to get bot help.
    Copyright (C) 2023 Kaimund
*/ 

import Discord from 'discord.js';
import { Command } from '../../core/CommandManager';
import { getSystemConfig } from '../../../lib/SystemDirectory';

// Main Function
async function run (interaction: Discord.ChatInputCommandInteraction): Promise<void> {
    return new Promise(async (resolve) => {
        const systemConfig = getSystemConfig();

        (systemConfig.webInfo.dashboardURL) ? interaction.reply({content: ':information_source: Shibe Documentation can be found at ' + systemConfig.webInfo.dashboardURL, ephemeral: true}).catch(() => {}) : interaction.reply({content: ':information_source: No help has been made available.', ephemeral: true}).catch(() => {});
        return resolve();
    });
}

// Metadata
export const command = new Command({
    data: {
        name: 'help',
        description: 'Get information on how to use Shibe.'
    },
    run: run
});
