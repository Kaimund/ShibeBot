/*
    ModerationTimer
    Periodically checks for lapsed bans on all servers.
    Copyright (C) 2023 Kaimund
*/

import sql from '../../lib/SQL';
import Discord from 'discord.js';
import AppLog from '../../lib/AppLog';
import { getUserConfig } from '../../lib/UserDirectory';
import { getGuildConfig } from '../../lib/GuildDirectory';

export interface EventEntry {
    eventID: bigint,
    guildID: string,
    userID: string,
    moderatorID: string,
    action: string,
    timestamp: bigint,
    expiry: bigint,
    reason: string,
    status: EventStatus
}

type EventStatus = 'ACTIVE' | 'APPEALED' | 'APPROVED' | 'DENIED' | 'PDENIED' | 'REVOKED' | 'EXPIRED';

export default class ModerationTimer {

    public constructor (client: Discord.Client) {
        // This function will run every minute
        const modTimerFunc = async () => {
            const expiredEvents = await sql.query(`SELECT * FROM ModActions WHERE expiry <= '${new Date().getTime()}' AND (status = 'ACTIVE' OR status = 'APPEALED' OR status = 'DENIED')`).catch((error) => {
                AppLog.error(error, 'Fetching expired moderation events');
            }) as void | Array<EventEntry>;
            if (!expiredEvents) return;

            for (const event of expiredEvents) {

                if (!event.expiry) return; // Skip permanent events

                const guild = await client.guilds.fetch(event.guildID).catch(() => {});

                if (event.expiry < (new Date().getTime() - 86400000)) {
                    // Don't do anything to events that expired over 24 hours ago. Instead, mark it as expired.
                    sql.query(`UPDATE ModActions SET status = 'EXPIRED' WHERE eventID = '${event.eventID}'`).catch((error) => {
                        AppLog.error(error, 'Expiring a ban');
                    });
                } else if (guild) {
                    // Mark the ban as expired in the database
                    await sql.query(`UPDATE ModActions SET status = 'EXPIRED' WHERE eventID = '${event.eventID}'`).catch((error) => {
                        AppLog.error(error, 'Expiring an event');
                    });
                    
                    switch (event.action) {
                        case 'BAN':
                            // Check for any further outstanding bans on the server. If none, unban the user.
                            const remainingBans = await sql.query(`SELECT * FROM ModActions WHERE userID = '${event.userID}' AND guildID = '${event.guildID}' AND action = 'BAN' AND (status = 'ACTIVE' OR status = 'APPEALED' OR status = 'DENIED')`).catch((error) => {
                                AppLog.error(error, 'Checking for remaining bans');
                            }) as void | Array<EventEntry>;

                            if (!remainingBans) return;

                            if (remainingBans.length === 0) {
                                // Get the target user object
                                const user = await client.users.fetch(event.userID).catch(() => {});
                                
                                // No outstanding bans remain. Actually unban the member
                                guild.members.unban(event.userID, 'Ban Expired').then(() => {
                                    // Try to contact the person over DM to notify of ban expiry
                                    if (user) user.send(`✅ Your ban on **${guild.name}** has expired.`).catch(() => {});
                                }).catch(() => {});
            
                                // Get server configuration
                                const guildData = await getGuildConfig(guild.id).catch((error) => {
                                    AppLog.error(error, 'Moderation Timer - Accessing Guild Data (ban)');
                                });
                                if (!guildData) return;
            
                                // Get the action channel
                                const actionChannel = await guild.channels.fetch(guildData.actionChannel).catch(() => {}) as Discord.TextChannel;
            
                                if (actionChannel) {
                                    const reportEmbed = new Discord.EmbedBuilder()
                                        .setAuthor({name: 'Ban Expired', iconURL: guild.client.user.avatarURL()})
                                        .setColor('#00d2ef')
                                        .setTimestamp()
                                        .setFooter({text: `Expired Event ID: ${event.eventID}`});
                                    
                                    // Try to fetch user data from Discord
                                    if (user) {
                                        reportEmbed.addFields({name: 'User', value: `<@${event.userID}> (${user.tag})`});
                                        reportEmbed.setThumbnail(user.avatarURL());
                                    } else {
                                        // Try to get user information from database instead
                                        const userData = await getUserConfig(event.userID).catch(() => {});
                                        if (userData) {
                                            reportEmbed.addFields({name: 'User', value: `<@${event.userID}> (${userData.username})`});
                                            reportEmbed.setThumbnail(userData.avatarURL);
                                        } else {
                                            // Bot only knows the user ID, so it will only provide this information
                                            reportEmbed.addFields({name: 'User', value: `<@${event.userID}>`});
                                        }
                                    }
                                    
                                    reportEmbed.addFields({name: 'Reason', value: event.reason || 'No reason provided'});
            
                                    actionChannel.send({embeds: [reportEmbed]}).catch(() => {});
                                }
                            }
                            break;
                        case 'TIMEOUT':
                            // Report an expired timeout
                            // Try to contact the person over DM to notify of ban expiry
                            const user = await client.users.fetch(event.userID).catch(() => {});
                            if (user) user.send(`🔊 Your timeout on **${guild.name}** has expired.`).catch(() => {});

                            // Fetch the guild data
                            const guildData = await getGuildConfig(guild.id).catch(error => {
                                AppLog.error(error, 'Moderation Timer - Accessing Guild Data (timeout)');
                            });
                            if (!guildData) return; // Don't continue if guild data is unavailable

                            // Get the action channel
                            const actionChannel = await guild.channels.fetch(guildData.actionChannel).catch(() => {}) as Discord.TextChannel;

                            // Finally, report to the action channel if there is one
                            if (actionChannel) {
                                // Build the report embed here
                                const reportEmbed = new Discord.EmbedBuilder()
                                .setAuthor({name: 'Timeout Expired', iconURL: guild.client.user.avatarURL() })
                                .setColor('#00ff99')
                                .setTimestamp()
                                .setFooter({text: `Expired Event ID: ${event.eventID}`});

                                // Try to fetch user data from Discord
                                if (user) {
                                    reportEmbed.addFields({name: 'User', value: `<@${event.userID}> (${user.tag})`});
                                    reportEmbed.setThumbnail(user.avatarURL());
                                } else {
                                    // Try to get user information from database instead
                                    const userData = await getUserConfig(event.userID).catch(() => {});
                                    if (userData) {
                                        reportEmbed.addFields({name: 'User', value: `<@${event.userID}> (${userData.username})`});
                                        reportEmbed.setThumbnail(userData.avatarURL);
                                    } else {
                                        // Bot only knows the user ID, so it will only provide this information
                                        reportEmbed.addFields({name: 'User', value: `<@${event.userID}>`});
                                    }
                                }
                                
                                reportEmbed.addFields({name: 'Reason', value: event.reason || 'No reason provided'});
        
                                actionChannel.send({embeds: [reportEmbed]}).catch(() => {});
                            }
                    }
                } 
            }

            setTimeout(modTimerFunc, 60000);
        };

        modTimerFunc();
    }
}
