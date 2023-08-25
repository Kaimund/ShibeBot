/*
    GuildMemberAddHandler
    Handles when a member joins a server.
    Copyright (C) 2023 Kaimund
*/ 

// ! This event will not fire!
// This is an event from a privileged intent which has been disabled as it is not needed.
// Privileged intents will need to be enabled to allow this event to fire. 

import Discord from 'discord.js';
import { AppLog } from '../../helpers/AppLog';
import { getModSchedule } from '../../helpers/GuildDirectory';
import newAccountMonitor from '../lib/NewAccountCheck';

export default async function guildMemberAdd (member: Discord.GuildMember) {

    // Check if Member is Muted
    const modSchedule = await getModSchedule(member.guild.id).catch((err) => {
        AppLog.error(new Error(`Could not retreive server mutes on ${member.guild.name} (ID: ${member.guild.id}) while screening a new member: ` + err), 'New Guild Member Event');
    });
    if (!modSchedule) return;

    // Process if account is new
    newAccountMonitor(member);

}
