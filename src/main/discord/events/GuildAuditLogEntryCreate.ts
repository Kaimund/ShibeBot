/**
 * GuildAuditLogEntryCreate
 * Called whenever there is a change to the server. Used to provide enhanced logging of moderation actions.
 * Copyright (C) 2023 Kaimund
 */

import sql from '../../lib/SQL';
import Discord from 'discord.js';
import AppLog from '../../lib/AppLog';
import { EventEntry } from '../lib/ModerationTimer';
import { getGuildConfig } from '../../lib/GuildDirectory';

export default async function guildAuditLogEntryCreate(auditLogEntry: Discord.GuildAuditLogsEntry, guild: Discord.Guild) {

    // If this was done by the bot, do not provide any additional logging. This should be handled by the part of the bot that's doing the change
    if (auditLogEntry.executorId === guild.client.user.id) return;

    // What was the event?
    switch (auditLogEntry.action) {
        case Discord.AuditLogEvent.MemberUpdate: {
            auditLogEntry.changes.forEach(async change => {
                // Process NEW timeouts and REVOKED timeouts
                if (change.key = 'communication_disabled_until') {
                    // Fetch the guild data
                    const guildData = await getGuildConfig(guild.id).catch(error => {
                        AppLog.error(error, 'Guild user timeout event (get guild data)');
                    });
                    if (!guildData) return; // Don't continue if guild data is unavailable

                    // Don't log external events if disabled on the guild
                    if (!guildData.logExternalModEvents) return;

                    // Is this a new timeout or a revoked timeout? Expired timeouts are logged by the GuildMemberUpdate event
                    if (change.new) {
                        // Report a new timeout
                        const timeNow = new Date().getTime();
                        const expiry = new Date(change.new as string).getTime();

                        // Mark all current timeouts as 'REVOKED' as this overrides any outstanding timeouts
                        await sql.query(`UPDATE ModActions SET status = 'REVOKED' WHERE guildID = '${guild.id}' AND userID = '${auditLogEntry.targetId}' AND action = 'TIMEOUT' AND (status = 'ACTIVE' OR status = 'APPEALED' OR status = 'DENIED')`).catch((error) => {
                            AppLog.error(error, 'Guild user timeout event - new timeout (revoke existing)');
                        });

                        // Create a new event
                        const eventID = Discord.SnowflakeUtil.generate();

                        // Log the new event in SQL for this user on this server
                        await sql.query(`INSERT INTO ModActions VALUES ('${eventID}', '${guild.id}', '${auditLogEntry.targetId}', '${auditLogEntry.executorId}', 'TIMEOUT', '${timeNow}', '${expiry}', '${sql.sanitize(auditLogEntry.reason)}', 'ACTIVE', NULL, NULL)`).catch((error) => {
                            AppLog.error(error, 'Guild user timeout event - new timeout (record new)');
                        });

                        // Finally, report to the action channel if there is one
                        if (guildData.actionChannel) {
                            // Try to get user objects
                            const moderatorUser = await guild.client.users.fetch(auditLogEntry.executorId).catch(() => { });
                            const moderatorAvatarURL = (moderatorUser) ? moderatorUser.avatarURL() : null;
                            const moderatorUserText = (moderatorUser) ? `<@${auditLogEntry.executorId}> (${moderatorUser.tag})` : `<@${auditLogEntry.executorId}>`;

                            const targetUser = await guild.client.users.fetch(auditLogEntry.targetId).catch(() => { });
                            const targetAvatarURL = (targetUser) ? targetUser.avatarURL() : null;
                            const targetUserText = (targetUser) ? `<@${auditLogEntry.targetId}> (${targetUser.tag})` : `<@${auditLogEntry.targetId}>`;

                            // Convert the time in minutes to a more friendly time description
                            const timeDiff = Math.ceil((expiry - timeNow) / 60000);
                            let timeText: string;
                            switch (timeDiff) {
                                case 1: timeText = '60 seconds'; break;
                                case 5: timeText = '5 minutes'; break;
                                case 10: timeText = '10 minutes'; break;
                                case 30: timeText = '30 minutes'; break;
                                case 60: timeText = '1 hour'; break;
                                case 180: timeText = '3 hours'; break;
                                case 360: timeText = '6 hours'; break;
                                case 720: timeText = '12 hours'; break;
                                case 1440: timeText = '1 day'; break;
                                case 4320: timeText = '3 days'; break;
                                case 10080: timeText = '7 days'; break;
                                default: timeText = timeDiff.toString() + ' minutes';
                            }

                            // Build the report embed here
                            const reportEmbed = new Discord.EmbedBuilder()
                                .setAuthor({ name: 'Timeout', iconURL: moderatorAvatarURL })
                                .setThumbnail(targetAvatarURL)
                                .setColor('#ff7f00')
                                .addFields(
                                    { name: 'User', value: targetUserText },
                                    { name: 'Moderator', value: moderatorUserText },
                                    { name: 'Time', value: timeText }
                                )
                                .setTimestamp()
                                .setFooter({ text: `Event ID: ${eventID}` });
                            if (auditLogEntry.reason) reportEmbed.addFields({ name: 'Reason', value: auditLogEntry.reason });

                            // Log the incident in the action channel
                            const actionChannel = await guild.channels.fetch(guildData.actionChannel).catch(() => { }) as Discord.TextChannel;
                            if (actionChannel) actionChannel.send({ embeds: [reportEmbed] }).catch(() => { });
                        }
                    } else {
                        // Report a revoked timeout
                        // Try to find the latest event (for logging, if there is an action channel set on the server)
                        let eventID: bigint;
                        if (guildData.actionChannel) {
                            const activeTimeouts = await sql.query(`SELECT * FROM ModActions WHERE guildID = '${guild.id}' AND userID = '${auditLogEntry.targetId}' AND action = 'TIMEOUT' AND (status = 'ACTIVE' OR status = 'APPEALED' OR status = 'DENIED')`).catch((error) => {
                                AppLog.error(error, 'Guild user timeout event - revoked timeout (get latest event ID)');
                            }) as void | Array<EventEntry>;

                            // Go through each event and find which one is the most recent - this will be the event ID in the report
                            if (activeTimeouts) {
                                activeTimeouts.forEach(event => {
                                    if (!eventID || eventID < event.eventID) eventID = event.eventID;
                                });
                            }
                        }

                        // Mark all active timeouts in SQL for this user on this server as 'REVOKED'
                        await sql.query(`UPDATE ModActions SET status = 'REVOKED' WHERE guildID = '${guild.id}' AND userID = '${auditLogEntry.targetId}' AND action = 'TIMEOUT' AND (status = 'ACTIVE' OR status = 'APPEALED' OR status = 'DENIED')`).catch((error) => {
                            AppLog.error(error, 'Guild user timeout event - revoked timeout');
                        });

                        // Finally, report to the action channel if there is one
                        if (guildData.actionChannel) {
                            // Try to get user objects
                            const moderatorUser = await guild.client.users.fetch(auditLogEntry.executorId).catch(() => { });
                            const moderatorAvatarURL = (moderatorUser) ? moderatorUser.avatarURL() : null;
                            const moderatorUserText = (moderatorUser) ? `<@${auditLogEntry.executorId}> (${moderatorUser.tag})` : `<@${auditLogEntry.executorId}>`;

                            const targetUser = await guild.client.users.fetch(auditLogEntry.targetId).catch(() => { });
                            const targetAvatarURL = (targetUser) ? targetUser.avatarURL() : null;
                            const targetUserText = (targetUser) ? `<@${auditLogEntry.targetId}> (${targetUser.tag})` : `<@${auditLogEntry.targetId}>`;

                            // Build the report embed here
                            const reportEmbed = new Discord.EmbedBuilder()
                                .setAuthor({ name: 'Timeout Revoked', iconURL: moderatorAvatarURL })
                                .setThumbnail(targetAvatarURL)
                                .setColor('#00ff99')
                                .addFields(
                                    { name: 'User', value: targetUserText },
                                    { name: 'Moderator', value: moderatorUserText },
                                )
                                .setTimestamp();

                            if (eventID) reportEmbed.setFooter({ text: `Event ID: ${eventID}` });
                            if (auditLogEntry.reason) reportEmbed.addFields({ name: 'Reason', value: auditLogEntry.reason });

                            // Log the incident in the action channel
                            const actionChannel = await guild.channels.fetch(guildData.actionChannel).catch(() => { }) as Discord.TextChannel;
                            if (actionChannel) actionChannel.send({ embeds: [reportEmbed] }).catch(() => { });
                        }
                    }
                }
            });
            break;
        } case Discord.AuditLogEvent.MemberKick: {
            // Fetch the guild data
            const guildData = await getGuildConfig(guild.id).catch(error => {
                AppLog.error(error, 'Guild user timeout event (get guild data)');
            });
            if (!guildData) return; // Don't continue if guild data is unavailable

            // Don't log external events if disabled on the guild
            if (!guildData.logExternalModEvents) return;

            // Report a new kick
            const timeNow = new Date().getTime();

            // Create a new event
            const eventID = Discord.SnowflakeUtil.generate();

            // Log the new event in SQL for this user on this server
            await sql.query(`INSERT INTO ModActions VALUES ('${eventID}', '${guild.id}', '${auditLogEntry.targetId}', '${auditLogEntry.executorId}', 'KICK', '${timeNow}', NULL, '${sql.sanitize(auditLogEntry.reason)}', 'ACTIVE', NULL, NULL)`).catch((error) => {
                AppLog.error(error, 'Guild user kick event');
            });

            // Finally, report to the action channel if there is one
            if (guildData.actionChannel) {
                // Try to get user objects
                const moderatorUser = await guild.client.users.fetch(auditLogEntry.executorId).catch(() => { });
                const moderatorAvatarURL = (moderatorUser) ? moderatorUser.avatarURL() : null;
                const moderatorUserText = (moderatorUser) ? `<@${auditLogEntry.executorId}> (${moderatorUser.tag})` : `<@${auditLogEntry.executorId}>`;

                const targetUser = await guild.client.users.fetch(auditLogEntry.targetId).catch(() => { });
                const targetAvatarURL = (targetUser) ? targetUser.avatarURL() : null;
                const targetUserText = (targetUser) ? `<@${auditLogEntry.targetId}> (${targetUser.tag})` : `<@${auditLogEntry.targetId}>`;

                // Build the report embed here
                const reportEmbed = new Discord.EmbedBuilder()
                    .setAuthor({ name: 'Kick', iconURL: moderatorAvatarURL })
                    .setThumbnail(targetAvatarURL)
                    .setColor('#ff0000')
                    .addFields(
                        { name: 'User', value: targetUserText },
                        { name: 'Moderator', value: moderatorUserText },
                    )
                    .setTimestamp()
                    .setFooter({ text: `Event ID: ${eventID}` });
                if (auditLogEntry.reason) reportEmbed.addFields({ name: 'Reason', value: auditLogEntry.reason });

                // Log the incident in the action channel
                const actionChannel = await guild.channels.fetch(guildData.actionChannel).catch(() => { }) as Discord.TextChannel;
                if (actionChannel) actionChannel.send({ embeds: [reportEmbed] }).catch(() => { });
            }
            break;
        } case Discord.AuditLogEvent.MemberBanAdd: {
            // Fetch the guild data
            const guildData = await getGuildConfig(guild.id).catch(error => {
                AppLog.error(error, 'Guild user ban event (get guild data)');
            });
            if (!guildData) return; // Don't continue if guild data is unavailable

            // Don't log external events if disabled on the guild
            if (!guildData.logExternalModEvents) return;

            // Report a new ban
            const timeNow = new Date().getTime();

            // Create a new event
            const eventID = Discord.SnowflakeUtil.generate();

            // Log the new event in SQL for this user on this server
            await sql.query(`INSERT INTO ModActions VALUES ('${eventID}', '${guild.id}', '${auditLogEntry.targetId}', '${auditLogEntry.executorId}', 'BAN', '${timeNow}', NULL, '${sql.sanitize(auditLogEntry.reason)}', 'ACTIVE', NULL, NULL)`).catch((error) => {
                AppLog.error(error, 'Guild user ban event');
            });

            // Finally, report to the action channel if there is one
            if (guildData.actionChannel) {
                // Try to get user objects
                const moderatorUser = await guild.client.users.fetch(auditLogEntry.executorId).catch(() => { });
                const moderatorAvatarURL = (moderatorUser) ? moderatorUser.avatarURL() : null;
                const moderatorUserText = (moderatorUser) ? `<@${auditLogEntry.executorId}> (${moderatorUser.tag})` : `<@${auditLogEntry.executorId}>`;

                const targetUser = await guild.client.users.fetch(auditLogEntry.targetId).catch(() => { });
                const targetAvatarURL = (targetUser) ? targetUser.avatarURL() : null;
                const targetUserText = (targetUser) ? `<@${auditLogEntry.targetId}> (${targetUser.tag})` : `<@${auditLogEntry.targetId}>`;

                // Build the report embed here
                const reportEmbed = new Discord.EmbedBuilder()
                    .setAuthor({ name: 'Ban', iconURL: moderatorAvatarURL })
                    .setThumbnail(targetAvatarURL)
                    .setColor('#800000')
                    .addFields(
                        { name: 'User', value: targetUserText },
                        { name: 'Moderator', value: moderatorUserText },
                    )
                    .setTimestamp()
                    .setFooter({ text: `Event ID: ${eventID}` });
                if (auditLogEntry.reason) reportEmbed.addFields({ name: 'Reason', value: auditLogEntry.reason });

                // Log the incident in the action channel
                const actionChannel = await guild.channels.fetch(guildData.actionChannel).catch(() => { }) as Discord.TextChannel;
                if (actionChannel) actionChannel.send({ embeds: [reportEmbed] }).catch(() => { });
            }
            break;
        } case Discord.AuditLogEvent.MemberBanRemove: {
            // Fetch the guild data
            const guildData = await getGuildConfig(guild.id).catch(error => {
                AppLog.error(error, 'Guild user unban event (get guild data)');
            });
            if (!guildData) return; // Don't continue if guild data is unavailable

            // Don't log external events if disabled on the guild
            if (!guildData.logExternalModEvents) return;

            // Try to find the latest event (for logging, if there is an action channel set on the server)
            let eventID: bigint;
            if (guildData.actionChannel) {
                const activeBans = await sql.query(`SELECT * FROM ModActions WHERE guildID = '${guild.id}' AND userID = '${auditLogEntry.targetId}' AND action = 'BAN' AND (status = 'ACTIVE' OR status = 'APPEALED' OR status = 'DENIED')`).catch((error) => {
                    AppLog.error(error, 'Guild user unban event (getting latest ban event ID)');
                }) as void | Array<EventEntry>;
    
                // Go through each event and find which one is the most recent - this will be the event ID in the report
                if (activeBans) {
                    activeBans.forEach(event => {
                        if (!eventID || eventID < event.eventID) eventID = event.eventID;
                    });
                }
            }

            // Mark all current bans as 'REVOKED'
            await sql.query(`UPDATE ModActions SET status = 'REVOKED' WHERE guildID = '${guild.id}' AND userID = '${auditLogEntry.targetId}' AND action = 'BAN' AND (status = 'ACTIVE' OR status = 'APPEALED' OR status = 'DENIED')`).catch(async (error) => {
                AppLog.error(error, 'Guild user unban event (revoking bans)');
            });

            // Finally, report to the action channel if there is one
            if (guildData.actionChannel) {
                // Try to get user objects
                const moderatorUser = await guild.client.users.fetch(auditLogEntry.executorId).catch(() => { });
                const moderatorAvatarURL = (moderatorUser) ? moderatorUser.avatarURL() : null;
                const moderatorUserText = (moderatorUser) ? `<@${auditLogEntry.executorId}> (${moderatorUser.tag})` : `<@${auditLogEntry.executorId}>`;

                const targetUser = await guild.client.users.fetch(auditLogEntry.targetId).catch(() => { });
                const targetAvatarURL = (targetUser) ? targetUser.avatarURL() : null;
                const targetUserText = (targetUser) ? `<@${auditLogEntry.targetId}> (${targetUser.tag})` : `<@${auditLogEntry.targetId}>`;

                // Build the report embed here
                const reportEmbed = new Discord.EmbedBuilder()
                    .setAuthor({ name: 'Unban', iconURL: moderatorAvatarURL })
                    .setThumbnail(targetAvatarURL)
                    .setColor('#00d2ef')
                    .addFields(
                        { name: 'User', value: targetUserText },
                        { name: 'Moderator', value: moderatorUserText },
                    )
                    .setTimestamp()
                    .setFooter({ text: `Event ID: ${eventID}` });
                if (auditLogEntry.reason) reportEmbed.addFields({ name: 'Reason', value: auditLogEntry.reason });

                // Log the incident in the action channel
                const actionChannel = await guild.channels.fetch(guildData.actionChannel).catch(() => { }) as Discord.TextChannel;
                if (actionChannel) actionChannel.send({ embeds: [reportEmbed] }).catch(() => { });
            }
        } default:
            break; // Not a relevant event, do nothing
    }

}