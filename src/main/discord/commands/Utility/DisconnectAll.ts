/*
    DisconnectAll
    Discord command to disconnect all users from a voice channel.
    Copyright (C) 2023 Kaimund
*/ 

import Discord from 'discord.js';
import { Command } from '../../core/CommandManager';

// Main Function
async function run (interaction: Discord.ChatInputCommandInteraction): Promise<void> {
    return new Promise(async (resolve) => {

        const member = interaction.member as Discord.GuildMember;

        // Shibe has no permission
        if (!interaction.guild.members.me.permissions.has('MoveMembers')) {
            interaction.reply({content: ':warning: Shibe does not have permission to disconnect members.', ephemeral: true}).catch(() => {});
            return resolve();
        }

        // Get the channel everyone is currently in
        const sourceChannel = member.voice.channel;
        if (!sourceChannel) {
            interaction.reply({content: ':information_source: You are not connected to a voice channel.', ephemeral: true}).catch(() => {});
            return resolve();
        }
        
        // Actually disconnect everyone
        sourceChannel.members.forEach(member => {
            member.voice.setChannel(null).catch(() => {});
        });
    
        // Report the results
        interaction.reply({content: `:white_check_mark: Disconnected all members from ${sourceChannel.name}`, ephemeral: true}).catch(() => {});
        return resolve();

    });
}

// Metadata
export const command = new Command({
    data: {
        name: 'disconnectall',
        description: 'Disconnect all members from a voice channel.',
        dmPermission: false,
        defaultMemberPermissions: 'MoveMembers'
    },
    run: run
});
