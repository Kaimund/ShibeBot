/*
    Persona
    Discord command for displaying a user or their own's persona.
    Copyright (C) 2023 Kaimund
*/

import Discord from 'discord.js';
import fs from 'fs';
import AppLog from '../../../lib/AppLog';
import { Command } from '../../core/CommandManager';
import { getUserPersona } from '../../../lib/UserDirectory';
import { getSystemConfig } from '../../../lib/SystemDirectory';

// Main Function
async function run (interaction: Discord.ChatInputCommandInteraction): Promise<void> {
    return new Promise(async (resolve) => {
        // Get the system config
        const systemConfig = getSystemConfig();

        // Get the user object
        const targetUser = interaction.options.getUser('user') ? interaction.options.getUser('user') : interaction.user ;

        // Get the user persona
        let serivceUnavailable = false;
        const persona = await getUserPersona(targetUser.id).catch(error => {
            AppLog.error(error, 'Persona command');
            serivceUnavailable = true;
        });

        // If the service is unavailable, report back to the user
        if (serivceUnavailable) {
            interaction.reply({content: ':warning: The Shibe data service is temporarily unavailable. Please try again later.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Check if a persona exists and report back if not
        if (!persona) {
            const personaEditorURL = systemConfig.webInfo.dashboardURL.endsWith('/') ? systemConfig.webInfo.dashboardURL + 'user/persona/' : systemConfig.webInfo.dashboardURL + '/user/persona/';
            (targetUser.id === interaction.user.id) ? interaction.reply({content: ':information_source: You do not have a persona. You can create one at: ' + personaEditorURL, ephemeral: true}).catch(() => {}) : interaction.reply({content: ':information_source: This user does not have a persona.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Create the embed object
        const personaEmbed = new Discord.EmbedBuilder();
        personaEmbed.setAuthor({name: `${targetUser.tag}'s Persona`, iconURL: targetUser.avatarURL()});
        personaEmbed.setTitle(persona.personaName);
        if (persona.personaColor) personaEmbed.setColor(persona.personaColor);
        if (persona.personaBio) personaEmbed.setDescription(persona.personaBio);
        if (persona.personaSpecies) personaEmbed.addFields({name: 'Species', value: persona.personaSpecies});
        if (persona.personaPronouns) personaEmbed.addFields({name: 'Pronouns', value: persona.personaPronouns});

        // Get the image for the persona embed
        if (fs.existsSync(`./db/personas/${targetUser.id}.png`)) {
            systemConfig.webInfo.dashboardURL.endsWith('/') ? personaEmbed.setThumbnail(`${systemConfig.webInfo.dashboardURL}img/personas/${targetUser.id}.png`) : personaEmbed.setThumbnail(`${systemConfig.webInfo.dashboardURL}/img/personas/${targetUser.id}.png`);
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
