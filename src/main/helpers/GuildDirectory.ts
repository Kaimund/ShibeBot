/*
    GuildDirectory
    Manages Guild Directory Files
    Copyright (C) 2023 Kaimund
*/ 

import fs from 'fs';
import { AppLog } from './AppLog';

// MARK: Directory

/**
 * Checks to make sure a server's directory is valid
 * @param guildID Server ID of directory to check
 */
export function checkGuildDirectory(guildID: string): Promise<void> {
    return new Promise ((resolve, reject) => {
        // Root Guild Directory
        if (!fs.existsSync('./db/guilds/')) {
            AppLog.info('Could not find the root guild directory. Creating a new one...');
            try {
                fs.mkdirSync('./db/guilds/');
            } catch (err) {
                reject(new Error('Failed to create the root guild directory: ' + err));
            }
        }
        // Specific Guild Directory
        if (!fs.existsSync(`./db/guilds/${guildID}/`)) {
            try {
                fs.mkdirSync(`./db/guilds/${guildID}/`);
            } catch (err) {
                reject(new Error('Failed to create the guild directory for Guild ID ' + guildID + ': ' + err));
            }
        }
        // Guild Configuration
        if (!fs.existsSync(`./db/guilds/${guildID}/config.json`)) {
            const defaultConfig: GuildConfig = {
                actionChannel: '',
                enabledModules: {
                    modCommands: true,
                    reports: true,
                    suggestions: true,
                    starboard: true
                }
            };
            try {
                fs.writeFileSync(`./db/guilds/${guildID}/config.json`, JSON.stringify(defaultConfig));
            } catch (err) {
                reject(new Error('Cannot create new guild configuration file: ' + err));
            }
        }
        // Moderation Schedule
        if (!fs.existsSync(`./db/guilds/${guildID}/moderation-schedule.json`)) {
            const emptyModSchedule: ModSchedule = {
                bans: {}
            };
            try {
                fs.writeFileSync(`./db/guilds/${guildID}/moderation-schedule.json`, JSON.stringify(emptyModSchedule));
            } catch (err) {
                reject(new Error('Cannot create new guild moderation schedule file: ' + err));
            }
        }
        // Moderation Policy
        if (!fs.existsSync(`./db/guilds/${guildID}/moderation-policy.json`)) {
            const emptyModPolicy: ModerationPolicy = {};
            try {
                fs.writeFileSync(`./db/guilds/${guildID}/moderation-policy.json`, JSON.stringify(emptyModPolicy));
            } catch (err) {
                reject(new Error('Cannot create new guild moderation policy file: ' + err));
            }
        }
        // Guild User Data
        if (!fs.existsSync(`./db/guilds/${guildID}/users.json`)) {
            const emptyUserData: GuildUserCollection = {};
            try {
                fs.writeFileSync(`./db/guilds/${guildID}/users.json`, JSON.stringify(emptyUserData));
            } catch (err) {
                reject(new Error('Cannot create new guild user data file: ' + err));
            }
        }
        // Everything checks out, resolve
        resolve();
    });
}

// MARK: Configuration

/**
 * A server configuration file
 */
export interface GuildConfig {
    /**
     * The channel to report moderation events to
     */
    actionChannel?: string;
    /**
     * A collection of enabled modules
     */
    enabledModules: ModulesEnabled;
};

/**
 * A collection of enabled modules
 */
interface ModulesEnabled {
    /**
     * Whether moderation commands (warn, mute, kick, ban) are enabled
     */
    modCommands: boolean;
    /**
     * Whether Shibe will accept user reports
     */
    reports: boolean;
    /**
     * Whether Shibe will accept suggestions
     */
    suggestions: boolean;
    /**
     * Whether Shibe will showcase messages with stars. Disable if managed by another bot
     */
    starboard: boolean;
};

/**
 * Check to make sure given data is a valid server configuration object
 * @param data Inputted JSON data of a server configuration file
 */
function checkGuildConfig(data: any): boolean {
    if (data.actionChannel) if (typeof data.actionChannel !== 'string') return false;
        
    if (!data.enabledModules) return false;
    if (data.enabledModules.modCommands === undefined) return false;
    if (data.enabledModules.reports === undefined) return false;
    if (data.enabledModules.suggestions === undefined) return false;
    if (data.enabledModules.starboard === undefined) return false;
    return true; // Everything is valid -- return true
}

/**
 * Fetch a server's configuration file.
 * @param guildID Server ID of the configuration file to fetch
 */
export function getGuildConfig(guildID: string): Promise<GuildConfig> {
    return new Promise ((resolve, reject) => {
        // Verify guild directory is valid
        checkGuildDirectory(guildID).catch((err) => reject(err));
        // Read the file
        try {
            const data = fs.readFileSync(`./db/guilds/${guildID}/config.json`, 'utf8');
            if (data) {
                // Try to parse
                try {
                    const parsedData = JSON.parse(data);
                    if (!checkGuildConfig(parsedData)) reject(new Error('Your server\'s configuration file is invalid.')); // Check Guild config for required values
                    resolve(parsedData);
                } catch (err) {
                    reject(new Error('Your server\'s configuration file is corrupted. ' + err));
                }
            } else reject(new Error('Your server\'s configuration file cannot be accessed.'));
        } catch (err) {
            reject(new Error('Cannot retreive guild configuration file: ' + err));
        }
    });
}

// MARK: Moderation Schedule

/**
 * List of all active bans, mutes, and other active moderation actions on a server.
 */
export interface ModSchedule {
    /**
     * A collection of all temporary server bans in a server
     */
    bans: GuildBans;
}

/**
 * A collection of all temporary server bans in a server
 */
export interface GuildBans {
    /**
     * An active ban entry for a user
     */
    [userID: string]: GuildBanEntry;
};

/**
 * An active ban entry for a user
 */
interface GuildBanEntry {
    /**
     * The user's last known username
     */
    username: string;
    /**
     * The URL of the banned user's avatar
     */
    avatar?: string;
    /**
     * The ban expiry time
     */
    time?: number;
    /**
     * The reason for the ban
     */
    reason?: string;
}

/**
 * Check to make sure given data is a valid server ban collection
 * @param data Inputted JSON data of a server ban collection
 */
function checkGuildBans(data: any): boolean {
    const entries = Object.values(data);
    // Check each entry
    let entriesOK = true;
    entries.forEach((entry: any) => {
        if (typeof entry.username !== 'string') return entriesOK = false;
        if (entry.avatar) {
            if (typeof entry.avatar !== 'string') return entriesOK = false;
        }
        if (entry.time) {
            if (typeof entry.time !== 'number') return entriesOK = false;
        }
        if (entry.reason) {
            if (typeof entry.reason !== 'string') return entriesOK = false;
        }
    });

    if (entriesOK) return true;
    else return false;
}

/**
 * Check to make sure given data is a valid moderation schedule
 * @param data Inputted JSON data of a server moderation schedule
 */
function checkModSchedule(data: any): boolean {
    // Check each entry
    let entriesOK = true;

    if (!data.bans) entriesOK = false;

    if (entriesOK) entriesOK = checkGuildBans(data.bans);

    if (entriesOK) return true;
    else return false;
}

/**
 * Fetch a server's moderation schedule.
 * @param guildID Server ID of the moderation schedule to fetch
 */
export function getModSchedule(guildID: string): Promise<ModSchedule> {
    return new Promise ((resolve, reject) => {
        // Verify guild directory is valid
        checkGuildDirectory(guildID).catch((err) => reject(err));
        // Read the file
        try {
            const data = fs.readFileSync(`./db/guilds/${guildID}/moderation-schedule.json`, 'utf8');
            if (data) {
                // Try to parse
                try {
                    const parsedData = JSON.parse(data);
                    if (!checkModSchedule(parsedData)) reject(new Error('Your server\'s moderation schedule database is invalid.')); // Check Guild config for required values
                    resolve(parsedData);
                } catch (err) {
                    reject(new Error('Your server\'s moderation schedule database is corrupted. ' + err));
                }
            } else reject(new Error('Your server\'s moderation schedule database cannot be accessed.'));
        } catch (err) {
            reject(new Error('Cannot retreive moderation schedule file: ' + err));
        }
    });
}

// MARK: Moderation Policy

export interface ModerationPolicy {
    [rule: string]: ModerationPolicyRule;
}

export interface ModerationPolicyRule {
    aliases: Array<string>;
    expiry?: number;
    policy: Array<ModPolicyInfraction>;
}

export interface ModPolicyInfraction {
    result: ModPolicyResult;
    message: string;
}

interface ModPolicyResult {
    action: ModAction;
    time?: number;
}

function validModAction(action: string) {
    switch (action) {
        case 'WARN': return true;
        case 'MUTE': return true;
        case 'KICK': return true;
        case 'BAN': return true;
        default: return false;
    }
}

type ModAction = 'WARN' | 'MUTE' | 'KICK' | 'BAN';

/**
 * Check to make sure given data is a valid moderation policy
 * @param data Inputted JSON data of a server moderation policy
 */
function checkModPolicy(data: any): boolean {
    
    let entriesOK = true;

    const keys = Object.keys(data);
    keys.forEach((key: any) => {
        if (typeof key !== 'string') entriesOK = false;
    });

    const entries = Object.values(data);
    entries.forEach((entry: any) => {       
        if (!entry.aliases) entriesOK = false;
        if (!entry.expiry) entriesOK = false;
        if (!entry.policy) entriesOK = false;

        if (entriesOK) {
            
            if (!(entry.aliases instanceof Array)) entriesOK = false;
            if (entriesOK) entry.aliases.forEach((alias: any) => {
                if (typeof alias !== 'string') entriesOK = false;
            });
    
            if (typeof entry.expiry !== 'number') entriesOK = false;
    
            if (!(entry.policy instanceof Array)) entriesOK = false;
            if (entriesOK) entry.policy.forEach((infraction: any) => {

                if (!infraction.result) entriesOK = false;
                if (entriesOK) {
                    if (!infraction.result.action) entriesOK = false;
                    if (entriesOK) if (!validModAction(infraction.result.action)) entriesOK = false;
                    if (infraction.result.time) if (typeof infraction.result.time !== 'number') entriesOK = false;
                    if (entriesOK) if (!infraction.message) entriesOK = false;
                    if (entriesOK) if (typeof infraction.message !== 'string') entriesOK = false;
                }

            });
        }

    });

    if (entriesOK) return true;
    else return false;

}

/**
 * Fetch a server's moderation schedule.
 * @param guildID Server ID of the moderation schedule to fetch
 */
export function getModPolicy(guildID: string): Promise<ModerationPolicy> {
    return new Promise ((resolve, reject) => {
        // Verify guild directory is valid
        checkGuildDirectory(guildID).catch((err) => reject(err));
        // Read the file
        try {
            const data = fs.readFileSync(`./db/guilds/${guildID}/moderation-policy.json`, 'utf8');
            if (data) {
                // Try to parse
                try {
                    const parsedData = JSON.parse(data);
                    if (!checkModPolicy(parsedData)) reject(new Error('Your server\'s moderation policy database is invalid.')); // Check Guild config for required values
                    resolve(parsedData);
                } catch (err) {
                    reject(new Error('Your server\'s moderation policy is corrupted. ' + err));
                }
            } else reject(new Error('Your server\'s moderation policy cannot be accessed.'));
        } catch (err) {
            reject(new Error('Cannot retreive moderation policy file: ' + err));
        }
    });
}

// MARK: User Data

export interface GuildUserCollection { 
    [userID: string]: GuildUserEntry;
}

interface GuildUserEntry {
    moderation: GuildUserEntryModeration;
}

interface GuildUserEntryModeration {
    infractions: UserRuleInfractionCollection;
}

export interface UserRuleInfractionCollection {
    [rule: string]: RuleInfractionCount;
}

interface RuleInfractionCount {
    active: number;
    total: number;
    nextDeactivate?: number;
}

/**
 * Check to make sure given data is a valid guild user data collection
 * @param data Inputted JSON data of a guild user data collection
 */
function checkGuildUserData(data: any): boolean {
    
    let entriesOK = true;

    const keys = Object.keys(data);
    keys.forEach((key: any) => {
        if (typeof key !== 'string') entriesOK = false;
    });

    const entries = Object.values(data);
    entries.forEach((entry: any) => {       
        if (!entry.moderation) entriesOK = false;
        if (entriesOK) if (!entry.moderation.infractions) entriesOK = false;

        if (entriesOK) {
            
            const infractionData = Object.values(entry.moderation.infractions);
            infractionData.forEach((infraction: any) => {
                if (!infraction.active) if (infraction.active !== 0) entriesOK = false;
                if (!infraction.total) if (infraction.active !== 0) entriesOK = false;

                if (entriesOK) {
                    if (typeof infraction.active !== 'number') entriesOK = false;
                    if (typeof infraction.total !== 'number') entriesOK = false;
                }
            });

        }

    });

    if (entriesOK) return true;
    else return false;

}

/**
 * Fetch a server's moderation schedule.
 * @param guildID Server ID of the moderation schedule to fetch
 */
export function getGuildUserData(guildID: string): Promise<GuildUserCollection> {
    return new Promise ((resolve, reject) => {
        // Verify guild directory is valid
        checkGuildDirectory(guildID).catch((err) => reject(err));
        // Read the file
        try {
            const data = fs.readFileSync(`./db/guilds/${guildID}/users.json`, 'utf8');
            if (data) {
                // Try to parse
                try {
                    const parsedData = JSON.parse(data);
                    if (!checkGuildUserData(parsedData)) reject(new Error('Your server\'s moderation policy database is invalid.')); // Check Guild config for required values
                    resolve(parsedData);
                } catch (err) {
                    reject(new Error('Your server\'s user data is corrupted. ' + err));
                }
            } else reject(new Error('Your server\'s user data cannot be accessed.'));
        } catch (err) {
            reject(new Error('Cannot retreive user data file: ' + err));
        }
    });
}

export type ModActionType = 'BAN';