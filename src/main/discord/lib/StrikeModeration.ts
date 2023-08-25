/*
    StrikeModeration
    Handle external moderation calls.
    Copyright (C) 2023 Kaimund
*/ 

// ! This needs to be redone

import fs from 'fs';
import Discord from 'discord.js';
import { getModSchedule } from '../../helpers/GuildDirectory';
import { friendlyDiscordAPIError } from '../../helpers/FriendlyDiscordAPIError';

/**
 * Warn the user by sending them an anonymous message
 * @param member The member to warn
 * @param reason The reason for the warning
 */
export async function warn (member: Discord.GuildMember, reason: string) {
    
    // Try to warn over DM
    member.user.send(`:warning: You were warned on **${member.guild.name}** for the following reason: ${reason}`)
    .catch(() => {});

}

/**
 * Mute a user on the server
 * @param member The member to mute
 * @param reason The reason for the mute
 * @param time Expiry time of the mute
*/
export async function mute (member: Discord.GuildMember, reason: string, time?: number): Promise<string> {
    return new Promise(async (resolve, reject) => {

        // Select Muted Role
        let role = member.guild.roles.cache.find(r => r.name === 'Muted');

        // Create a new role if it doesn't exist already
        if (!role) {
            // Create the role
            const newRole = await member.guild.roles.create({
                name: 'Muted',
                color: '#818386',
                permissions: []
            });
            if (!newRole) return;
            role = newRole;

            // Create permission overrides for this role
            member.guild.channels.fetch().then(channels => channels.forEach(async (channel) => {
                channel.permissionOverwrites.set([{
                    id: role.id, 
                    deny: ['SendMessages', 'AddReactions', 'Speak']
                }]).catch(() => {});
            }));

        }
        
        // Import mute database
        const modSchedule = await getModSchedule(member.guild.id).catch((err) => {
            return reject(new Error(`Failed to get mute database for ${member.guild.name} while trying to mute a user.\nReason: ${err}`));
        });
        if (!modSchedule) return;

        // Give member the muted role
        const memberMuted = await member.roles.add(role).catch(error => {
            return resolve(':warning: Shibe couldn\'t mute this member. ' + friendlyDiscordAPIError(error));
        });
        if (!memberMuted) return;
        
        await member.voice.setMute(true, 'User Muted').catch(() => {}); 

        // Save back to file
        try {
            fs.writeFileSync(`./db/guilds/${member.guild.id}/moderation-schedule.json`, JSON.stringify(modSchedule, null, 4));
        } catch (error) {
            return reject(error);
        }

        // Try to notify the member over DM that they have been muted
        if (reason && time) member.user.send(`:mute: You have been muted on **${member.guild.name}** for ${String(time/60000)} minutes for the following reason: ${reason}`).catch(() => {});
        else if (reason) member.user.send(`:mute: You have been muted on **${member.guild.name}** for the following reason: ${reason}`).catch(() => {});
        else if (time) member.user.send(`:mute: You have been muted on **${member.guild.name}** for ${String(time/60000)} minutes`).catch(() => {});
        else member.user.send(`:mute: You have been muted on **${member.guild.name}**.`).catch(() => {});

        return resolve('OK');
    });
}

/**
 * Kick a member from the server
 * @param member The member to kick
 * @param reason The reason for the kick
 */
export async function kick (member: Discord.GuildMember, reason: string): Promise<string> {
    return new Promise(async (resolve, reject) => {

        if (reason) {
            await member.user.send(`:x: You were kicked from **${member.guild.name}** for the following reason: ${reason}`).catch(() => {});
            await member.kick(reason).catch(error => {return reject(error);});
        } else {
            await member.user.send(`:x: You were kicked from **${member.guild.name}**.`).catch(() => {});
            await member.kick().catch(error => {return reject(error);});
        }

        return resolve('OK');
    });
}

/**
 * Ban a user from the server
 * @param user The user to ban
 * @param reason The reason for the ban
 * @param time Expiry time of the ban
 */
export async function ban (member: Discord.GuildMember, reason: string, time?: number): Promise<string> {
    return new Promise(async (resolve, reject) => {

        // Target member not bannable by system
        if (!member.bannable) {
            return resolve(':warning: Shibe cannot ban this member.');
        }

        // Import ban database
        const modSchedule = await getModSchedule(member.guild.id).catch((err) => {
            reject(new Error(`Failed to get ban database for ${member.guild.name} while trying to ban a user.\nReason: ${err}`));
        });
        if (!modSchedule) return;

        // Argument 0 represents a time, therefore the ban is temporary
        if (time) {
            // Create JSON object
            modSchedule.bans[member.user.id] = {
                username: member.user.tag,
                avatar: member.user.avatarURL(),
                time: Date.now() + time,
                reason: reason
            };

            // Save back to file
            try {
                fs.writeFileSync(`./db/guilds/${member.guild.id}/moderation-schedule.json`, JSON.stringify(modSchedule, null, 4));
            } catch (err) {
                return reject(new Error(`Failed to write to ban database for ${member.guild.name} while trying to ban a user.\nReason: ${err}`));
            }

        }

        // Try to notify the member that they have been banned (only if they're already in the server)
        if (reason && time) await member.send(`:no_entry: You have been banned from **${member.guild.name}** for ${String(time/60000)} minutes for the following reason: ${reason}`).catch(() => {});
        else if (reason) await member.send(`:no_entry: You have been banned from **${member.guild.name}** for the following reason: ${reason}`).catch(() => {});
        else if (time) await member.send(`:no_entry: You have been banned from **${member.guild.name}** for ${String(time/60000)} minutes`).catch(() => {});
        else await member.send(`:no_entry: You have been banned from **${member.guild.name}**.`).catch(() => {});

        // Actually ban the member
        if (reason) {
            const banSuccessful = await member.guild.members.ban(member.user, {
                reason: reason,
                deleteMessageDays: 1
            }).catch(error => {return reject(new Error(error));});
            if (!banSuccessful) return;
        } else {
            const banSuccessful = await member.guild.members.ban(member.user, {
                deleteMessageDays: 1
            }).catch(error => {return reject(new Error(error));});
            if (!banSuccessful) return;
        }

        return resolve('OK');
    });
}