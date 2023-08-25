/*
    Ping
    Discord command for users to test the bot and API latency to Discord.
    Copyright (C) 2023 Kaimund
*/ 

import Discord from 'discord.js';
import { Command } from '../../core/CommandManager';

// Main Function
async function run (interaction: Discord.ChatInputCommandInteraction): Promise<void> {
    return new Promise(async (resolve) => {
        const reply = await interaction.reply({content: ':hourglass: One moment, please...', fetchReply: true, ephemeral: true});
        interaction.editReply(`Latency is ${reply.createdTimestamp - interaction.createdTimestamp} ms. API latency is ${Math.round(interaction.client.ws.ping)} ms.`).catch(() => {});

        return resolve();
    });
}

// Metadata
export const command: Command = {
    data: {
        name: 'ping',
        description: 'Test the bot and websocket\'s latency'
    },
    run: run
};
