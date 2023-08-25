/*
    ResetBans
    Discord command to wipe a server's ban list.
    Copyright (C) 2023 Kaimund
*/ 

import Discord from 'discord.js';
import { Command } from '../../core/CommandManager';

// Main Function
async function run (interaction: Discord.ChatInputCommandInteraction): Promise<void> {
    return new Promise(async (resolve) => {
    
        // No permission
        if (!interaction.guild.members.me.permissions.has('BanMembers')) {
            interaction.reply({content: ':warning: Shibe doesn\'t have permission to manage bans on this server.', ephemeral: true}).catch(() => {});
            return resolve();
        }
    
        // Everything checks out. Now import information.
        const serverBans = await interaction.guild.bans.fetch();

        // Now for each user in the ban list, apply bans to target guild.
        serverBans.forEach(userToUnban => {
            interaction.guild.members.unban(userToUnban.user, 'Clearing this server\'s ban list').catch(() => {});
        });
        interaction.reply({content: `:white_check_mark: Successfully sent requests to unban ${serverBans.size} members.`, ephemeral: true}).catch(() => {});
        return resolve();

    });
}

// Metadata
export const command = new Command({
    data: {
        name: 'resetbans',
        description: 'Wipes the server\'s ban list.',
        dmPermission: false,
        defaultMemberPermissions: 'Administrator'
    },
    run: run
});
