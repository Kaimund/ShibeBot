/*
    Persona
    Discord command for displaying a user or their own's persona.
    Copyright (C) 2023 Kaimund
*/

import Discord from 'discord.js';
import fs from 'fs';
import { Command } from '../../core/CommandManager';
import { getUserConfig } from '../../../helpers/UserDirectory';

// Main Function
async function run (interaction: Discord.ChatInputCommandInteraction): Promise<void> {
    return new Promise(async (resolve, reject) => {

        // Get the user object
        const targetUser = interaction.options.getUser('user') ? interaction.options.getUser('user') : interaction.user ;

        // Get the user configuration file
        const userConfig = await getUserConfig(targetUser.id).catch((err) => {
            reject(new Error(`Failed to get guild configuration for ${interaction.guild.name}\nReason: ${err}`));
        });
        if (!userConfig) return;

        // Check if a persona exists and report back if not
        if (!userConfig.persona) {
            const personaEditorURL = process.env.BOT_DASHBOARD_URL.endsWith('/') ? process.env.BOT_DASHBOARD_URL + 'user/persona/' : process.env.BOT_DASHBOARD_URL + '/user/persona/';
            (targetUser.id === interaction.user.id) ? interaction.reply({content: ':information_source: You do not have a persona. You can create one at: ' + personaEditorURL, ephemeral: true}).catch(() => {}) : interaction.reply({content: ':information_source: This user does not have a persona.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Create the embed object
        const personaEmbed = new Discord.EmbedBuilder();
        personaEmbed.setAuthor({name: `${targetUser.tag}'s Persona`, iconURL: targetUser.avatarURL()});
        personaEmbed.setTitle(userConfig.persona.name);
        if (userConfig.persona.color) personaEmbed.setColor(userConfig.persona.color);
        if (userConfig.persona.bio) personaEmbed.setDescription(userConfig.persona.bio);
        if (userConfig.persona.species) personaEmbed.addFields({name: 'Species', value: userConfig.persona.species});

        // Get the image for the persona embed
        if (fs.existsSync(`./public/img/personas/${targetUser.id}.png`)) {
            process.env.BOT_DASHBOARD_URL.endsWith('/') ? personaEmbed.setThumbnail(`${process.env.BOT_DASHBOARD_URL}img/personas/${targetUser.id}.png`) : personaEmbed.setThumbnail(`${process.env.BOT_DASHBOARD_URL}/img/personas/${targetUser.id}.png`);
        }

        // Reply with the embed
        await interaction.reply({embeds: [personaEmbed]}).catch(() => {});
        return resolve();
        
    });
}

// Metadata
export const command = new Command({
    data: {
        name: 'persona',
        description: 'Display a user\'s persona',
        options: [
            {
                name: 'user',
                description: 'Display the persona of a different user',
                type: 6,
                required: false
            }
        ]
    },
    run: run,
});
