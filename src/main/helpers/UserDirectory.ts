/*
    UserDirectory
    Manages User Directory Files
    Copyright (C) 2023 Kaimund
*/ 

//import { ColorResolvable } from 'discord.js';
import sql from './SQL';
import { ColorResolvable } from 'discord.js';

/**
 * Format for a user configuration file on Shibe
 */
export interface UserConfig {
    userID: string,
    username: string
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
        sql('SELECT * FROM Users WHERE userID = ' + userID).then(data => {
            const result = data[0] as UserConfig;
            resolve(result);
        }).catch(error => {
            reject(error);
        });
    });
}

export async function getUserPersona(userID: string): Promise<UserPersona> {
    return new Promise((resolve, reject) => {
        sql('SELECT * FROM Personas WHERE userID = ' + userID).then(data => {
            const result = data[0] as UserPersona;
            resolve(result);
        }).catch(error => {
            reject(error);
        });
    });
}