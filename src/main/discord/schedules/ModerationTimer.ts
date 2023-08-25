/*
    ModerationTimer
    Periodically checks for lapsed bans and mutes on all servers.
    Copyright (C) 2023 Kaimund
*/

import Discord from 'discord.js';
import fs from 'fs';
import { AppLog } from '../../helpers/AppLog';
import { getModSchedule, getGuildConfig, getGuildUserData, getModPolicy } from '../../helpers/GuildDirectory';

export default class ModerationTimer {

    public constructor (client: Discord.Client) {

        // This function will run every minute
        const modTimerFunc = async () => {

            // Cycle through each guild in index
            // TODO: Make this much more efficient.
            /*
                This code will only check cached servers for expired bans. 
                Need to provide a central location for all active user account bans and check THIS instead of relying on the cache.
                This should be achieved after moving to an SQL database.
            */

            for (const selectedGuild of client.guilds.cache) {

                const guild = selectedGuild[1];

                // Try to get muted users - continue if this is not possible
                const modSchedule = await getModSchedule(guild.id).catch((err) => {
                    AppLog.error(new Error(`Failed to get mute database for Guild ${guild.id} during moderation timer.\nReason: ${err}`), 'Moderation Timer - Accessing Mute Directory');
                });
                if (!modSchedule) return;

                // MARK: Banned Users
                for (const bannedUsersEntry in modSchedule.bans) {

                    // Check if the listed ban has expired
                    if (Date.now() > modSchedule.bans[bannedUsersEntry].time) {

                        // Actually unban the member
                        guild.members.unban(bannedUsersEntry, 'Ban Expired').catch(() => {});

                        // Try to contact the person over DM to notify of ban expiry
                        const user = await client.users.fetch(bannedUsersEntry).catch(() => {});
                        if (user) user.send(`✅ Your ban on **${guild.name}** has expired.`).catch(() => {});

                        // Remove the entry from the ban directory
                        delete modSchedule.bans[bannedUsersEntry];
                        
                        // Write back to database
                        try {
                            fs.writeFileSync(`./db/guilds/${guild.id}/moderation-schedule.json`, JSON.stringify(modSchedule));
                        } catch (error) {
                            AppLog.error(new Error(`Unable to unban a member. ${error}`), 'Moderation Timer - Updating Ban Directory');
                        }

                        // Get server configuration
                        const guildConfig = await getGuildConfig(guild.id).catch((err) => {
                            AppLog.error(new Error(`Failed to get guild configuration for Guild ${guild.id}\nReason: ${err}`), 'Moderation Timer - Accessing Guild Configuration');
                        });
                        if (!guildConfig) return;

                        // Get the action channel
                        const actionChannel = await client.channels.fetch(guildConfig.actionChannel).catch(() => {}) as Discord.TextChannel;

                        if (actionChannel) {
                            if (!modSchedule.bans[bannedUsersEntry].reason) modSchedule.bans[bannedUsersEntry].reason = 'No reason provided';
                            const reportEmbed = new Discord.EmbedBuilder()
                                .setAuthor({name: 'Ban Expired', iconURL: client.user.avatarURL()})
                                .setThumbnail(modSchedule.bans[bannedUsersEntry].avatar)
                                .setColor('#00d2ef')
                                .addFields(
                                    {name: 'User', value: `<@${bannedUsersEntry}> (${modSchedule.bans[bannedUsersEntry].username})`},
                                    {name: 'Reason', value: modSchedule.bans[bannedUsersEntry].reason}
                                )
                                .setTimestamp()
                                .setFooter({text: `Unbanned User ID: ${bannedUsersEntry}`});
                            actionChannel.send({embeds: [reportEmbed]}).catch(() => {});
                        }
                    }
                }

                // MARK: Strike Expiration
                const modPolicy = await getModPolicy(guild.id).catch((err) => {
                    AppLog.error(new Error(`Failed to get mod policy for Guild ${guild.id}\nReason: ${err}`), 'Moderation Timer - Accessing Guild Moderation Policy');
                });
                if (!modPolicy) return;

                const userData = await getGuildUserData(guild.id).catch((err) => {
                    AppLog.error(new Error(`Failed to get guild user data for Guild ${guild.id}\nReason: ${err}`), 'Moderation Timer - Accessing Guild User Data');
                });
                if (!userData) return;
                
                const users = Object.keys(userData);
                users.forEach(userID => {
                    const infractions = Object.keys(userData[userID].moderation.infractions);
                    infractions.forEach(infraction => {
                        const infractionCount = userData[userID].moderation.infractions[infraction];
                        if (!infractionCount.nextDeactivate) return;

                        if (Date.now() >= userData[userID].moderation.infractions[infraction].nextDeactivate) {
                            userData[userID].moderation.infractions[infraction].active--;

                            try {
                                if (userData[userID].moderation.infractions[infraction].active && modPolicy[infraction].expiry) {
                                    userData[userID].moderation.infractions[infraction].nextDeactivate += modPolicy[infraction].expiry;
                                } else {
                                    delete userData[userID].moderation.infractions[infraction].nextDeactivate;
                                }
                            } catch (error) {
                                // Rule policy doesn't exist anymore, delete from user log
                                delete userData[userID].moderation.infractions[infraction];
                            }
    
                            // Write back to database
                            try {
                                fs.writeFileSync(`./db/guilds/${guild.id}/users.json`, JSON.stringify(userData));
                            } catch (error) {
                                AppLog.error(new Error(`Unable to update user data while removing an active strike for Guild ID ${guild.id}, infraction ${infraction}: ${error}`), 'Moderation Timer - Updating Active Strikes');
                            }
                        }
                    });
                });
            }

            setTimeout(modTimerFunc, 60000);
        };

        modTimerFunc();
    }
}
