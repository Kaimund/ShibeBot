/*
    8Ball
    Discord command for randomizing a response resembling Albert C. Carter's magic 8-ball.
    Copyright (C) 2023 Kaimund
*/

import Discord from 'discord.js';
import { Command } from '../../core/CommandManager';

// Main Function
async function run (interaction: Discord.ChatInputCommandInteraction): Promise<void> {
    return new Promise((resolve) => {
        switch (1 + Math.floor(Math.random() * 20)) {
            case 1: interaction.reply('It is certain.').catch(() => {}); break;
            case 2: interaction.reply('As I see it, yes.').catch(() => {}); break;
            case 3: interaction.reply('It is decidedly so.').catch(() => {}); break;
            case 4: interaction.reply('Most likely.').catch(() => {}); break;
            case 5: interaction.reply('Without a doubt.').catch(() => {}); break;
            case 6: interaction.reply('Outlook good.').catch(() => {}); break;
            case 7: interaction.reply('Yes - definitely.').catch(() => {}); break;
            case 8: interaction.reply('Yes.').catch(() => {}); break;
            case 9: interaction.reply('You may rely on it.').catch(() => {}); break;
            case 10: interaction.reply('Signs point to yes.').catch(() => {}); break;
            case 11: interaction.reply('Reply hazy, try again.').catch(() => {}); break;
            case 12: interaction.reply('Ask again later.').catch(() => {}); break;
            case 13: interaction.reply('Better not tell you now.').catch(() => {}); break;
            case 14: interaction.reply('Cannot predict now.').catch(() => {}); break;
            case 15: interaction.reply('Concentrate and ask again.').catch(() => {}); break;
            case 16: interaction.reply('Don\'t count on it.').catch(() => {}); break;
            case 17: interaction.reply('My reply is no.').catch(() => {}); break;
            case 18: interaction.reply('My sources say no.').catch(() => {}); break;
            case 19: interaction.reply('Outlook not so good.').catch(() => {}); break;
            case 20: interaction.reply('Very doubtful.').catch(() => {}); break;
        }
        return resolve();
    });
}

// Metadata
export const command = new Command({
    data: {
        name: '8ball',
        description: 'The magic 8-Ball\'s Wisdom',
    },
    run: run
});
