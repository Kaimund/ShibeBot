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
export function checkSystemDirectory() {
    // System Configuration
    if (!fs.existsSync('./config.json')) {
        AppLog.info('Could not find the system configuration file. Creating a new one...');
        const defaultConfig: SystemConfig = {
            apiPort: 12918,
            webInfo: {
                clientRedirect: 'http://localhost:12918/login',
                dashboardURL: 'http://localhost:12918/',
                inviteURL: 'http://localhost:12918/invite'
            },
            access: {
                systemAuthorizedUsers: [],
                bannedServers: [],
                bannedUsers: []
            }
        };
        try {
            fs.writeFileSync('./config.json', JSON.stringify(defaultConfig));
        } catch (err) {
            AppLog.fatal('Cannot create new system configuration file.\n' + err);
            AppLog.fatal('This file is REQUIRED for Shibe to work. Shibe will now exit.');
            process.exit(1);
        }
    }
    // Everything checks out, return
    return;
}

/**
 * Shibe System Configuration Object
 */
export interface SystemConfig {
    /**
     * The port which the Shibe API runs from
     */
    apiPort: number;
    /**
     * References for the Web interface
     */
    webInfo: SystemConfigWebInfo;
    /**
     * Configuration for Shibe administrative access and restricted entities
     */
    access: SystemConfigAccess;
};

export interface SystemConfigWebInfo {
    /**
     * API callback for logins to the web interface
     */
    clientRedirect: string;
    /**
     * Web interface URL
     */
    dashboardURL: string;
    /**
     * Invite link for adding Shibe to your own server
     */
    inviteURL: string;
};

export interface SystemConfigAccess {
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

    if (typeof data.apiPort !== 'number') return false;

    if (typeof data.webInfo.clientRedirect !== 'string') return false;
    if (typeof data.webInfo.dashboardURL !== 'string') return false;
    if (typeof data.webInfo.inviteURL !== 'string') return false;

    if (!(data.access.systemAuthorizedUsers instanceof Array)) return false;
    data.access.systemAuthorizedUsers.forEach(entry => {
        if (typeof entry !== 'string') return false;
    });

    if (!(data.access.bannedServers instanceof Array)) return false;
    data.access.bannedServers.forEach(entry => {
        if (typeof entry !== 'string') return false;
    });

    if (!(data.access.bannedUsers instanceof Array)) return false;
    data.access.bannedUsers.forEach(entry => {
        if (typeof entry !== 'string') return false;
    });

    return true; // Everything is valid -- return true
}

/**
 * Obtain Shibe's configuration file
 */
export function getSystemConfig(): SystemConfig {
    // Verify guild directory is valid
    checkSystemDirectory();

    // Read the file
    try {
        const data = fs.readFileSync('./config.json', 'utf8');
        if (data) {
            // Try to parse
            try {
                const parsedData: SystemConfig = JSON.parse(data);
                if (!checkSystemConfig(parsedData)) {
                    // System config is invalid. Report and exit. 
                    AppLog.fatal('Your system configuration file is invalid. Please check the file for errors, or delete the file to replace the configuration with the system default.');
                    process.exit(1);
                }
                return parsedData;
            } catch (error) {
                AppLog.fatal('Your system configuration file is corrupt. Please check the file for errors, or delete the file to replace the configuration with the system default.\n' + error);
                process.exit(1);
            }
        } else {
            AppLog.fatal('Your system configuration file is inaccessible. Shibe cannot continue with this data and will now exit.');
            process.exit(1);
        }
    } catch (error) {
        AppLog.fatal('Cannot retrieve system configuration file.\n' + error);
        process.exit(1);
    }
}
