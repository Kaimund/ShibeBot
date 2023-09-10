/*
    InteractionCreate
    Handles incoming slash commands.
    Copyright (C) 2023 Kaimund
*/ 

import Discord from 'discord.js';
import AppLog from '../../lib/AppLog';
import CommandManager from '../core/CommandManager';
import { getSystemConfig } from '../../lib/SystemDirectory';

/**
 * List of users who've ran a command in a set time. These users can't run any more commands during this timeout.
 */
const recentInteractions = new Set();
/**
 * List of users who've been timed out and reminded about it. They won't be reminded again until removed from this list.
 */
const cmdSpamReminded = new Set();

export default async function interactionCreate(interaction: Discord.Interaction) {

    // The bot will ignore commands if they are not chat commands.
    if (!interaction.isChatInputCommand()) return;
    // The bot will ignore any messages from bots.
    if (interaction.user.bot) return;
    // The bot will ignore any messages over Direct Message.
    if (!interaction.channel) {
        interaction.reply({content: 'At this time, Shibe cannot respond to messages over DM.', ephemeral: true}).catch(() => {});
        return;
    }
    // The bot will ignore any messages outside of a normal text channel. 
    if (interaction.channel.type !== Discord.ChannelType.GuildText) {
        interaction.reply({content: 'At this time, Shibe can only respond to commands in a normal text channel.', ephemeral: true}).catch(() => {});
        return;
    };

    // Import the System Configuration
    const systemConfig = getSystemConfig();

    // Check if the server is banned from using Shibe
    if (systemConfig.access.bannedServers.includes(interaction.guild.id)) {
        if (interaction.user.id !== interaction.client.user.id) await interaction.reply({content: ':octagonal_sign: This server is banned from using Shibe.', ephemeral: true}).catch(() => {});
        interaction.guild.leave().catch(() => {});
        return;
    }

    // Import the command using the key given from the command directory
    const command = CommandManager.commands.get(interaction.commandName.toLowerCase());

    function sendingTooQuickly (interaction: Discord.ChatInputCommandInteraction) {
        if (recentInteractions.has(interaction.user.id)) {
            // Check to see if a user has already been reminded before sending the notification.
            if (!cmdSpamReminded.has(interaction.user.id)) {
                interaction.reply({content: ':alarm_clock: You\'re sending commands too quickly! Slow down, then try again.', ephemeral: true}).catch(() => {});
                cmdSpamReminded.add(interaction.user.id);
                setTimeout(() => {
                    cmdSpamReminded.delete(interaction.user.id);
                }, 10000);
            }
            return true;
        } else {
            // Adds the user to the set so that they can't talk for 3 seconds
            recentInteractions.add(interaction.user.id);
            setTimeout(() => {
                // Removes the user from the set after 3 seconds
                recentInteractions.delete(interaction.user.id);
            }, 3000); 
            return false;
        }
    }
    // If there's a match found, try to run it
    if (command) {
        // First check to see when the user ran the last command
        if (sendingTooQuickly(interaction)) return;

        // Check if the user is banned from Shibe
        if (systemConfig.access.bannedUsers.includes(interaction.user.id)) {
            interaction.reply({content: ':octagonal_sign: You are banned from using Shibe.', ephemeral: true}).catch(() => {});
            return;
        }

        // Run the command
        command.run(interaction).catch(error => {
            // If something goes wrong, report it.
            AppLog.error(error, `Discord Command - ${command.data.name}`);
            interaction.reply({content: ':no_entry: Sorry, something went wrong.\n```\n' + error + '\n```', ephemeral: true}).catch(() => {});
        });
    }
    
}
