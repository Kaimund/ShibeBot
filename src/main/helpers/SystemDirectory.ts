/*
    SystemDirectory
    Manages System Directory Files
    Copyright (C) 2023 Kaimund
*/ 

import fs from 'fs';
import { AppLog } from './AppLog';

/**
 * Check whether the system directory is intact
 */
export function checkSystemDirectory(): Promise<void> {
    return new Promise ((resolve, reject) => {
        // Guild Configuration
        if (!fs.existsSync('./config.json')) {
            AppLog.info('Could not find the system configuration file. Creating a new one...');
            const defaultConfig: SystemConfig = {
                systemAuthorizedUsers: [],
                bannedServers: [],
                bannedUsers: []
            };
            try {
                fs.writeFileSync('./config.json', JSON.stringify(defaultConfig));
            } catch (err) {
                reject(new Error('Cannot create new system configuration file: ' + err));
            }
        }
        // Everything checks out, resolve
        resolve();
    });
}

/**
 * Shibe System Configuration Object
 */
export interface SystemConfig {
    /**
     * A list of users who have full administrative control over Shibe
     */
    systemAuthorizedUsers: Array<string>;
    /**
     * A list of servers forbidden to use Shibe
     */
    bannedServers: Array<string>;
    /**
     * A list of users forbidden to use Shibe
     */
    bannedUsers: Array<string>;
};

/**
 * Verify that loaded JSON data is a valid system configuration file
 * @param data JSON data to be checked
 */
function checkSystemConfig(data: any): boolean {

    if (!(data.systemAuthorizedUsers instanceof Array)) return false;
    data.systemAuthorizedUsers.forEach(entry => {
        if (typeof entry !== 'string') return false;
    });

    if (!(data.bannedServers instanceof Array)) return false;
    data.bannedServers.forEach(entry => {
        if (typeof entry !== 'string') return false;
    });

    if (!(data.bannedUsers instanceof Array)) return false;
    data.bannedUsers.forEach(entry => {
        if (typeof entry !== 'string') return false;
    });

    return true; // Everything is valid -- return true
}

/**
 * Obtain Shibe's configuration file
 */
export function getSystemConfig(): Promise<SystemConfig> {
    return new Promise ((resolve, reject) => {
        // Verify guild directory is valid
        checkSystemDirectory().catch((err) => reject(err));
        // Read the file
        try {
            const data = fs.readFileSync('./config.json', 'utf8');
            if (data) {
                // Try to parse
                try {
                    const parsedData = JSON.parse(data);
                    if (!checkSystemConfig(parsedData)) reject(new Error('The system configuration file is invalid.')); // Check Guild config for required values
                    resolve(parsedData);
                } catch (err) {
                    reject(new Error('The system configuration file is corrupted. ' + err));
                }
            } else reject(new Error('The system configuration file cannot be accessed.'));
        } catch (err) {
            reject(new Error('Cannot retreive guild configuration file: ' + err));
        }
    });
}
