/*
    UserDirectory
    Manages User Directory Files
    Copyright (C) 2023 Kaimund
*/ 

import { ColorResolvable } from 'discord.js';
import fs from 'fs';
import { AppLog } from './AppLog';

/**
 * Format for a user configuration file on Shibe
 */
export interface UserConfig {
    appeals?: GuildAppealCollection;
    persona?: UserPersona;
};

/**
 * A collection of servers with appeals
 */
interface GuildAppealCollection {
    /**
     * A list of appeals on a server - use to crosslink
     */
    [guildID: string]: Array<string>;
}

/**
 * Format for a user's persona on Shibe
 */
interface UserPersona {
    name: string;
    species?: string;
    bio?: string;
    color?: ColorResolvable;
}

/**
 * Check to make sure a guild configuration is valid
 * @param data Imported data from a JSON file
 */
function checkUserConfig(data: any): boolean {
    let entriesOK = true;
    if (!data) entriesOK = false;
    if (data.persona) {
        if (typeof data.persona.name !== 'string') return false;
        if (data.persona.species) {
            if (typeof data.persona.species !== 'string') return false;
            else if (data.persona.species.length > 256) return false;
        }
        if (data.persona.bio) {
            if (typeof data.persona.bio !== 'string') return false;
            if (data.persona.bio.length > 2000) return false;
        }
        if (data.persona.color) {
            if (typeof data.persona.color !== 'string') return false;
            if (!(new RegExp(/#[0-9a-f]{6}|#[0-9a-f]{3}/gi).test(data.persona.color)) || (!data.persona.color.startsWith('#')) || !(data.persona.color.length === 4 || data.persona.color.length === 7)) return false;
        }
    }
    return entriesOK; // Everything is valid -- return true
}

/**
 * Retrieves a user's configuration file as a manipulatable object
 * @param userID The ID of the user to get the configuration from
 */
export async function getUserConfig(userID: string): Promise<UserConfig> {
    return new Promise ((resolve, reject) => {
        // Root User Directory
        if (!fs.existsSync('./db/users/')) {
            AppLog.info('Could not find the root user directory. Creating a new one...');
            try {
                fs.mkdirSync('./db/users/');
            } catch (err) {
                reject(new Error('Failed to create the root user directory: ' + err));
            }
        }
        // Specific User Directory
        if (!fs.existsSync(`./db/users/${userID}/`)) {
            try {
                fs.mkdirSync(`./db/users/${userID}/`);
            } catch (err) {
                reject(new Error('Failed to create the user directory for User ID ' + userID + ': ' + err));
            }
        }
        // User Configuration
        if (!fs.existsSync(`./db/users/${userID}/config.json`)) {
            const defaultConfig: UserConfig = {};
            try {
                fs.writeFileSync(`./db/users/${userID}/config.json`, JSON.stringify(defaultConfig));
            } catch (err) {
                reject(new Error('Cannot create new user configuration file: ' + err));
            }
           
        }
        // Read the file
        try {
            const data = fs.readFileSync(`./db/users/${userID}/config.json`, 'utf8');
            if (data) {
                // Try to parse
                try {
                    const parsedData = JSON.parse(data);
                    if (!checkUserConfig(parsedData)) reject(new Error('Your user configuration file is invalid.')); // Check user config for required values
                    resolve(parsedData);
                } catch (err) {
                    reject(new Error('Your user configuration file is corrupted. ' + err));
                }
            } else reject(new Error('Your user configuration file cannot be accessed.'));
        } catch (err) {
            reject(new Error('Cannot retreive user configuration file: ' + err));
        }
    });
}

/**
 * Synchronously retrieves a user's configuration file as a manipulatable object
 * @param userID The ID of the user to get the configuration from
 */
export function getUserConfigSync(userID: string): UserConfig {

    // Root User Directory
    if (!fs.existsSync('./db/users/')) {
        AppLog.info('Could not find the root user directory. Creating a new one...');
        try {
            fs.mkdirSync('./db/users/');
        } catch (err) {
            throw new Error('Failed to create the root user directory: ' + err);
        }
    }
    // Specific User Directory
    if (!fs.existsSync(`./db/users/${userID}/`)) {
        try {
            fs.mkdirSync(`./db/users/${userID}/`);
        } catch (err) {
            throw new Error('Failed to create the user directory for User ID ' + userID + ': ' + err);
        }
    }
    // User Configuration
    if (!fs.existsSync(`./db/users/${userID}/config.json`)) {
        const defaultConfig: UserConfig = {};
        try {
            fs.writeFileSync(`./db/users/${userID}/config.json`, JSON.stringify(defaultConfig));
        } catch (err) {
            throw new Error('Cannot create new user configuration file: ' + err);
        }
        
    }
    // Read the file
    try {
        const data = fs.readFileSync(`./db/users/${userID}/config.json`, 'utf8');
        if (data) {
            // Try to parse
            try {
                const parsedData = JSON.parse(data);
                if (!checkUserConfig(parsedData)) throw new Error('Your user configuration file is invalid.'); // Check user config for required values
                return parsedData;
            } catch (err) {
                throw new Error('Your user configuration file is corrupted. ' + err);
            }
        } else throw new Error('Your user configuration file cannot be accessed.');
    } catch (err) {
        throw new Error('Cannot retreive user configuration file: ' + err);
    }

}