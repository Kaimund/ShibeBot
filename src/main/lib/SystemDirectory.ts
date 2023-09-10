/*
    SystemDirectory
    Manages System Directory Files
    Copyright (C) 2023 Kaimund
*/ 

import fs from 'fs';
import yaml from 'js-yaml';

/**
 * Check whether the system directory is intact
 */
export function checkSystemDirectory() {
    // System Configuration
    if (!fs.existsSync('./config.yml')) {
        info('Could not find the system configuration file. Creating a new one...');
        try {
            fs.copyFileSync('./src/main/lib/config.default.yml', './config.yml');
        } catch (err) {
            fatal('Cannot create new system configuration file.\n' + err);
            fatal('This file is REQUIRED for Shibe to work. Shibe will now exit.');
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
     * References for the Web interface
     */
    webInfo: SystemConfigWebInfo;
    /**
     * Database configuration
     */
    data: SystemConfigDataInfo;
    /**
     * Configuration for Shibe administrative access and restricted entities
     */
    access: SystemConfigAccess;
};

export interface SystemConfigWebInfo {
    /**
     * Web interface URL
     */
    dashboardURL: string;
    /**
     * Invite link for adding Shibe to your own server
     */
    inviteURL: string;
};

export interface SystemConfigDataInfo {
    /**
     * The address of the server hosting the Shibe database
     */
    server: string;
    /**
     * The name of the database to use
     */
    database: string;
    /**
     * The username of the SQL server user to use
     */
    username: string;
    /**
     * Whether encryption should be used. This is REQUIRED for databases hosted in Microsoft Azure
     */
    useEncryption: boolean;
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

    if (typeof data.webInfo.dashboardURL !== 'string') return false;
    if (typeof data.webInfo.inviteURL !== 'string') return false;

    if (typeof data.data.server !== 'string') return false;
    if (typeof data.data.database !== 'string') return false;
    if (typeof data.data.username !== 'string') return false;
    if (typeof data.data.useEncryption !== 'boolean') return false;

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
        const configFile = fs.readFileSync('./config.yml', 'utf8');
        const data = yaml.load(configFile) as SystemConfig;
        if (data) {
            // Try to parse
            try {
                if (!checkSystemConfig(data)) {
                    // System config is invalid. Report and exit. 
                    fatal('Your system configuration file is invalid. Please check the file for errors, or delete the file to replace the configuration with the system default.');
                    process.exit(1);
                }
                return data;
            } catch (error) {
                fatal('Your system configuration file is corrupt. Please check the file for errors, or delete the file to replace the configuration with the system default.\n' + error);
                process.exit(1);
            }
        } else {
            fatal('Your system configuration file is inaccessible. Shibe cannot continue with this data and will now exit.');
            process.exit(1);
        }
    } catch (error) {
        fatal('Cannot retrieve system configuration file.\n' + error);
        process.exit(1);
    }
}

// Functions for outputting to console
function info (message: string) {
    console.log(`\x1b[34m[${new Date().toString()}] [INFO] ${message}\x1b[0m`);
}

function fatal (message: string) {
    console.log(`\x1b[41m\x1b[37m[${new Date().toString()}] [FATAL] ${message}\x1b[0m`);
}