/*
    Help
    Discord command for users to get bot help.
    Copyright (C) 2023 Kaimund
*/ 

import Discord from 'discord.js';
import { Command } from '../../core/CommandManager';

// Main Function
async function run (interaction: Discord.ChatInputCommandInteraction): Promise<void> {
    return new Promise(async (resolve) => {
        (process.env.BOT_DOCS_URL) ? interaction.reply({content: ':information_source: Shibe Documentation can be found at ' + process.env.BOT_DOCS_URL, ephemeral: true}).catch(() => {}) : interaction.reply({content: ':information_source: No help has been made available.', ephemeral: true}).catch(() => {});
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
