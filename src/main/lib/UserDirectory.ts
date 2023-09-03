/*
    UserDirectory
    Manages User Data
    Copyright (C) 2023 Kaimund
*/ 

import sql from './SQL';
import bot from '../discord/bot';
import { ColorResolvable, User } from 'discord.js';

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
 */
export async function getUserConfig(userID: string): Promise<UserConfig> {
    return new Promise((resolve, reject) => {
        // Fetch the user's username
        let user: User;
        bot.shibe.getClient().users.fetch(userID).then(fetchedUser => {
            user = fetchedUser;
        }).catch(() => {});

        let username: string;
        user ? username = user.tag : username = null;

        // Check if data exists. Create it if not
        sql.query('SELECT * FROM Users WHERE userID = ' + userID).then(data => {
            if (data.length > 0) {
                const result = data[0] as UserConfig;

                // Check if username has changed, and update the database if it has
                if (result.username != username) {
                    sql.query(`UPDATE Users SET username = '${sql.sanitize(username)}' WHERE userID = '${userID}'`).catch(() => {});
                }

                resolve(result);
            } else {
                const defaultUser: UserConfig = {
                    userID: userID,
                    username: username
                };
                sql.query(`INSERT INTO Users (userID, username) VALUES ('${defaultUser.userID}', '${sql.sanitize(defaultUser.username)}')`).then(() => {
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