/*
    UserDirectory
    Manages User Data
    Copyright (C) 2023 Kaimund
*/ 

import sql from './SQL';
import { Client, ColorResolvable, User } from 'discord.js';

/**
 * Format for a user configuration file on Shibe
 */
export interface UserConfig {
    userID: string,
    username?: string,
    avatarURL?: string
};

/**
 * Format for a user's persona on Shibe
 */
interface UserPersona {
    userID: string;
    personaName: string;
    personaPronouns?: string;
    personaSpecies?: string;
    personaBio?: string;
    personaColor?: ColorResolvable;
}

/**
 * Retrieves a user's configuration file as a manipulatable object
 * @param userID The ID of the user to get the configuration from
 * @param client The client to lookup the user with
 */
export async function getUserConfig(userID: string, client: Client): Promise<UserConfig> {
    return new Promise(async (resolve, reject) => {
        // Fetch the user's username
        let user: User;
        await client.users.fetch(userID).then(fetchedUser => {
            user = fetchedUser;
        }).catch(() => {});

        const username = (user) ? user.tag : '';
        const avatarURL = (user) ? user.avatarURL() : '';

        // Check if data exists. Create it if not
        await sql.query(`SELECT * FROM Users WHERE userID = '${userID}'`).then(async data => {
            if (data.length > 0) {
                const result = data[0] as UserConfig;

                // Check if username has changed, and update the database if it has
                if (result.username != username) {
                    sql.query(`UPDATE Users SET username = '${sql.sanitize(username)}' WHERE userID = '${userID}'`).catch(() => {});
                    result.username = username;
                }
                // Check if avatar URL has changed, and update the database if it has
                if ((result.avatarURL != avatarURL) && avatarURL) {
                    sql.query(`UPDATE Users SET avatarURL = '${sql.sanitize(avatarURL)}' WHERE userID = '${userID}'`).catch(() => {});
                    result.avatarURL = avatarURL;
                }

                resolve(result);
            } else {
                const defaultUser: UserConfig = {
                    userID: userID,
                    username: username,
                    avatarURL: avatarURL
                };
                await sql.query(`INSERT INTO Users (userID, username, avatarURL) VALUES ('${defaultUser.userID}', '${sql.sanitize(defaultUser.username)}', '${defaultUser.avatarURL}')`).then(() => {
                    resolve(defaultUser);
                }).catch(sentError => {
                    reject(sentError);
                });
            }
        }).catch(error => {
            reject(error);
        });
    });
}

export async function getUserPersona(userID: string): Promise<UserPersona> {
    return new Promise((resolve, reject) => {
        sql.query('SELECT * FROM Personas WHERE userID = ' + userID).then(data => {
            const result = data[0] as UserPersona;
            resolve(result);
        }).catch(error => {
            reject(error);
        });
    });
}