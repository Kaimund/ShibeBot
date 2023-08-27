/*
    GuildMemberUpdate
    Handles when a Discord member changes their information.
    Copyright (C) 2023 Kaimund
*/ 

// ! This event will not fire!
// This is an event from a privileged intent which has been disabled as it is not needed.
// Privileged intents will need to be enabled to allow this event to fire. 

import Discord from 'discord.js';
import { AppLog } from '../../helpers/AppLog';
import { getGuildConfig } from '../../helpers/GuildDirectory';

export default async function guildMemberUpdate (oldMember: Discord.GuildMember) {

    // Check if Member is Banned from Setting a Nickname
    const guildConfig = await getGuildConfig(oldMember.guild.id).catch((err) => {
        AppLog.error(new Error(`Could not retrieve server config on server ${oldMember.guild.id} while updating a user: ` + err), 'Guild Member Update Event');
    });
    if (!guildConfig) return;

}
