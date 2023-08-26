/*
    Shibe
    The core Shibe Discord app object.
    Copyright (C) 2023 Kaimund
*/ 

import Discord, { IntentsBitField } from 'discord.js';
import fs from 'fs';
import glob from 'glob';
import { AppLog } from '../../helpers/AppLog';
import EventManager from './EventManager';
import CommandManager, { Command } from './CommandManager';
import ModerationTimer from '../schedules/ModerationTimer';

export default class Shibe {

    // This object stores the client which the bot uses to interface with Discord
    private client: Discord.Client;
    // This object states whether Shibe started successfully
    startupStatus: StatusFlag;

    // This is run when a Shibe process is spawned.
    constructor() {
        this.startupStatus = StatusFlag.Pending;
        AppLog.trace('Starting a Shibe process...');

        //const ALL_INTENTS = (1 << 0) + (1 << 1) + (1 << 2) + (1 << 3) + (1 << 4) + (1 << 5) + (1 << 6) + (1 << 7) + (1 << 8) + (1 << 9) + (1 << 10) + (1 << 11) + (1 << 12) + (1 << 13) + (1 << 14) + (1 << 15) + (1 << 16) + (1 << 20) + (1 << 21);
        this.client = new Discord.Client({ intents: [
            IntentsBitField.Flags.Guilds,
            IntentsBitField.Flags.GuildModeration,
            IntentsBitField.Flags.GuildVoiceStates,
            IntentsBitField.Flags.GuildMessageReactions
        ] }); // Spawn a new client and set this instance to use it
        AppLog.trace('Spawning an event manager...');
        new EventManager(this); // Also create an event manager for scheduling
    }

    // This is run when a Shibe process is ordered to start.
    start() {
        // Check to make sure the database folders exist
        if(!fs.existsSync('./db')) {
            AppLog.info('Could not find the database directory. Creating a new one...');
            try{
                fs.mkdirSync('./db');
            } catch (err) {
                AppLog.fatal('Could not create the required database directory. ' + err);
                AppLog.fatal('Shibe cannot continue. Exiting...');
                this.client.destroy();
                process.exit(1);
            }
        } if(!fs.existsSync('./db/guilds')){
            AppLog.info('Could not find the root guilds directory. Creating a new one...');
            try{
                fs.mkdirSync('./db/guilds');
            } catch (err) {
                AppLog.fatal('Could not create the required root guilds directory. ' + err);
                AppLog.fatal('Shibe cannot continue. Exiting...');
                this.client.destroy();
                process.exit(1);
            }
        } if(!fs.existsSync('./db/users')){
            AppLog.info('Could not find the root users directory. Creating a new one...');
            try {
                fs.mkdirSync('./db/users');
            } catch (err) {
                AppLog.fatal('Could not create the required root users directory. ' + err);
                AppLog.fatal('Shibe cannot continue. Exiting...');
                this.client.destroy();
                process.exit(1);
            }
        } if(!fs.existsSync('./db/personas')){
            AppLog.info('Could not find the persona image directory. Creating a new one...');
            try {
                fs.mkdirSync('./db/personas');
            } catch (err) {
                AppLog.fatal('Could not create the required persona image directory. ' + err);
                AppLog.fatal('Shibe cannot continue. Exiting...');
                this.client.destroy();
                process.exit(1);
            }
        }

        // Prepare the Command Manager
        CommandManager.commands = new Discord.Collection();

        // Prepare the command data to send to Discord
        const commandData: Discord.ChatInputApplicationCommandData[] = [];

        try {
            // Scan the commands directory for commands
            glob(__dirname + '/../commands/**/*.js', {absolute: false}, (error, files) => {

                // Error
                if (error) {
                    AppLog.error(new Error('Unable to load commands. ' + error), 'Accessing Commands Directory');
                    this.startupStatus = StatusFlag.Errored;
                }

                // Number of Matches
                if (files.length === 0) return AppLog.warning('Unable to locate any commands. Shibe won\'t be able to respond to requests.');
                else AppLog.log(`Loading ${files.length} commands...`);

                // Cycle through each file to import its command
                files.forEach(fileName => {
                    // If not a file, skip
                    try {
                        // eslint-disable-next-line @typescript-eslint/no-var-requires
                        const file = require(fileName);
                        if (file) {

                            // Add the command to the command store
                            const commandFile: Command = file.command;

                            // If there is no command in the file, skip it
                            if (!commandFile) {
                                AppLog.warning('A non-command JavaScript file was found in your commands folder. It will be skipped.', 'Loading Non-JS File in Command Directory');
                                return;
                            }

                            // If the command does not have all required properties, skip it
                            if (!(commandFile.data.name || commandFile.data.description)) {
                                AppLog.warning('An incomplete JavaScript file was found in your commands folder.', 'Loading Incomplete File in Command Directory');
                                return;
                            }

                            CommandManager.commands.set(commandFile.data.name, commandFile);
                            commandData.push(commandFile.data);

                        } else return AppLog.error(new Error('An invalid or empty command file was found in your commands folder.'), 'Loading Invalid File in Command Directory');
                    } catch (err) {
                        AppLog.error(new Error('Failed to read a command file: ' + err), 'Reading Command File');
                    }
                });
                
                // Send slash commands to the Discord API
                const rest = new Discord.REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
                rest.put(Discord.Routes.applicationCommands(process.env.CLIENT_ID), { body: commandData });

            });
        } catch (error) {
            AppLog.error(new Error('Failed to register slash commands with Discord: ' + error.message), 'Loading Slash Commands');
        }

        // Sign on to Discord
        AppLog.log('Signing on to Discord...');
        this.client.login(process.env.BOT_TOKEN).then(() => AppLog.log('Successfully logged in to Discord.')).catch(() => {
            AppLog.fatal('Failed to log in. Your token may be invalid, or there may be a service outage.');
            this.client.destroy();
            this.startupStatus = StatusFlag.Failed;
            return;
        });

        // Do post-startup stuff here
        new ModerationTimer(this.client); // Create a moderation scheduler

    }

    getClient() {
        return this.client;
    }

}

export enum StatusFlag {
    Successful, Pending, Failed, Errored
}