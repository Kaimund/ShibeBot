/*
    EventManager
    Listens to Discord events and routes to their appropriate handlers.
    Copyright (C) 2023 Kaimund
*/ 

import Discord from 'discord.js';
import Shibe, { StatusFlag } from './Shibe';
import AppLog from '../../lib/AppLog';
import interactionCreate from '../events/InteractionCreate';
import messageReactionAdd from '../events/MessageReactionAdd';
import messageReactionRemove from '../events/MessageReactionRemove';
import guildAuditLogEntryCreate from '../events/GuildAuditLogEntryCreate';

export default class EventManager {

    private client: Discord.Client;

    constructor(core: Shibe) {

        //this.core = core
        this.client = core.getClient();

        // Discord Events
        this.client.on('ready', () => { 
            AppLog.success('Shibe is now ready!');

            core.startupStatus = StatusFlag.Successful;
        });
        this.client.on('error', (error) => { 
            AppLog.error(new Error('An error occurred with the connection to Discord. The connection may have dropped out, or they may be a service outage. The error was: ' + error), 'Discord Error Event Emitted', true);
            console.log(error.stack);
        });
        this.client.on('interactionCreate', interactionCreate);
        this.client.on('messageReactionAdd', messageReactionAdd);
        this.client.on('messageReactionRemove', messageReactionRemove);
        this.client.on('guildAuditLogEntryCreate', guildAuditLogEntryCreate);
    }

}
