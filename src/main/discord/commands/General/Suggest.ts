/*
    Suggest
    Discord command for users to make server suggestions.
    Copyright (C) 2023 Kaimund
*/ 

import Discord from 'discord.js';
import { Command } from '../../core/CommandManager';

// Main Function
async function run (interaction: Discord.ChatInputCommandInteraction): Promise<void> {
    return new Promise(async (resolve) => {
        // Find the suggestion channel
        const suggestionChannel = await interaction.guild.channels.fetch('suggestions').catch(() => {}) as Discord.TextChannel;
        if (!suggestionChannel) {
            interaction.reply({content: ':information_source: This server is not accepting suggestions.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Make sure the channel is a text channel
        if (suggestionChannel.type !== Discord.ChannelType.GuildText) {
            interaction.reply({content: ':warning: This server\'s suggestions channel is not a text channel. Suggestions cannot be accepted at this time.', ephemeral: true}).catch(() => {});
            return resolve();
        } 

        const suggestionTitle = interaction.options.getString('title');
        const suggestionDescription = interaction.options.getString('suggestion');
       
        // Try to post suggestion
        try{
            const suggestionEmbed = new Discord.EmbedBuilder()
            .setAuthor({
                name: interaction.user.tag, 
                iconURL: interaction.user.avatarURL()
            })
            .setColor('#42f48f')
            .setTitle(suggestionTitle)
            .setDescription(suggestionDescription)
            .setTimestamp();
            const suggestionPost = await suggestionChannel.send({embeds: [suggestionEmbed]}) as Discord.Message;
            suggestionPost.react('👍').catch(() => {});
            suggestionPost.react('👎').catch(() => {});

            interaction.reply(':white_check_mark: Thank you for your suggestion.').catch(() => {});

            return resolve();
        } catch {
            interaction.reply(':warning: Couldn\'t submit your suggestion. Shibe does not have permission to access the suggestions channel.').catch(() => {});
            return resolve();
        }
    });
}

// Metadata
export const command = new Command({
    data: {
        name: 'suggest',
        description: 'Submits a suggestion which may be voted on by others.',
        dmPermission: false,
        options: [
            {
                name: 'suggestion',
                description: 'Your suggestion',
                type: 3,
                required: true
            },
            {
                name: 'title',
                description: 'The title of the description',
                type: 3,
                required: false
            }
        ]
    },
    run: run
});
