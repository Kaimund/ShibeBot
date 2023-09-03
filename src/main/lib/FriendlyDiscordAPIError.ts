/*
    FriendlyDiscordAPIError
    Makes Discord API Errors friendly.
    Copyright (C) 2023 Kaimund
*/ 

import { DiscordAPIError } from 'discord.js';

/**
 * Get a friendly description for DiscordAPIError
 * @param error The resolved DiscordAPIError
 */
export function friendlyDiscordAPIError (error: DiscordAPIError): string {
    switch (error.message) {
        case 'Missing Permissions': return 'Shibe doesn\'t have permission.';
        default: return;    
    }
}