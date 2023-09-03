/*
    GuildDirectory
    Manages Discord guild Data
    Copyright (C) 2023 Kaimund
*/ 

import sql from './SQL';

/**
 * A guild data object
 */
export interface GuildConfig {
    /**
     * The guild ID
     */
    guildID: string;
    /**
     * The channel to report moderation events to
     */
    actionChannel?: string;
    /**
     * Whether moderation commands (warn, mute, kick, ban) are enabled
     */
    modCommandsModuleEnabled: boolean;
    /**
     * Whether Shibe will accept user reports
     */
    reportsModuleEnabled: boolean;
    /**
     * Whether Shibe will accept suggestions
     */
    suggestionsModuleEnabled: boolean;
    /**
     * Whether Shibe will showcase messages with stars. Disable if managed by another bot
     */
    starboardModuleEnabled: boolean;
};

/**
 * Fetch a guild's basic data and configuration
 * @param guildID Guild ID of the configuration file to fetch
 */
export function getGuildConfig(guildID: string): Promise<GuildConfig> {
    return new Promise ((resolve, reject) => {
        sql.query('SELECT * FROM Guilds WHERE guildID = ' + guildID).then(data => {
            if (data.length > 0) {
                const result = data[0] as GuildConfig;
                resolve(result);
            } else {
                // Check if data exists. Create it if not
                const defaultGuild: GuildConfig = {
                    guildID: guildID,
                    modCommandsModuleEnabled: true,
                    reportsModuleEnabled: true,
                    suggestionsModuleEnabled: false,
                    starboardModuleEnabled: false
                };
                sql.query(`INSERT INTO Servers (guildID, modCommandsModuleEnabled, reportsModuleEnabled, suggestionsModuleEnabled, starboardModuleEnabled) VALUES ('${guildID}', '${defaultGuild.modCommandsModuleEnabled}', '${defaultGuild.reportsModuleEnabled}', '${defaultGuild.suggestionsModuleEnabled}', '${defaultGuild.starboardModuleEnabled}')`).then(() => {
                    resolve(defaultGuild);
                }).catch(sentError => {
                    reject(sentError);
                });
            }
        }).catch(error => {
            reject(error);
        });
    });
}