/*
    NewAccountMonitor
    Manages new accounts which are less than a certain age.
    Copyright (C) 2023 Kaimund
*/ 

import Discord from 'discord.js';
import { AppLog } from '../../helpers/AppLog';
import { getGuildConfig } from '../../helpers/GuildDirectory';

export default async function newAccountMonitor (member: Discord.GuildMember) {

    // Import the configuration for the relevant guild
    const guildConfig = await getGuildConfig(member.guild.id).catch((err) => {
        AppLog.error(new Error(`Failed to get guild configuration for Guild ${member.guild.id}\nReason: ${err}`), 'New Account Monitor');
    });
    if (!guildConfig) return;

    const reportChannel = member.guild.channels.cache.find(channel => channel.id === guildConfig.actionChannel) as Discord.TextChannel;
    if (!reportChannel) return;
    if (reportChannel.type !== Discord.ChannelType.GuildText) return;

    const accountAgeMs = (Date.now() - member.user.createdTimestamp);

    function convertMS( milliseconds: number ): TimeFormat {
        let seconds = Math.floor(milliseconds / 1000);
        let minute = Math.floor(seconds / 60);
        seconds = seconds % 60;
        let hour = Math.floor(minute / 60);
        minute = minute % 60;
        const day = Math.floor(hour / 24);
        hour = hour % 24;
        return {
            day: day,
            hour: hour,
            minute: minute,
            seconds: seconds
        };
    }

    interface TimeFormat {
        seconds: number;
        minute: number;
        hour: number;
        day: number;
    }

    const accountAge = convertMS(accountAgeMs);

    if (member.user.createdTimestamp >= (Date.now() - 604800000)) await reportChannel.send(`:warning: **New Account:** <@${member.id}> (${member.user.tag}) - ${accountAge.day} days, ${accountAge.hour} hours, ${accountAge.minute} minutes, and ${accountAge.seconds} seconds old.`).catch(() => {});
}
