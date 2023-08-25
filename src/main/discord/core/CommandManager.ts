/*
    CommandManager
    Stores the bot's Discord commands into a callable object.
    Copyright (C) 2023 Kaimund
*/ 

import Discord from 'discord.js';

export default class CommandManager {

    public static commands: Discord.Collection<string, Command>;

}

// The command interface is the structure of a Command.
export class Command implements CommandInterface {

    /**
     * Command metadata
     */
    data: Discord.ChatInputApplicationCommandData;

    /**
     * The function which will be called when the command is called in chat.
     */ 
    run: (interaction: Discord.ChatInputCommandInteraction) => Promise<void>;

    constructor (command: CommandInterface) {

        this.data = command.data;
        this.run = command.run;

    }

}

// Valid metadata for commands
export interface CommandInterface {

    data: Discord.ChatInputApplicationCommandData;
    run: (interaction: Discord.ChatInputCommandInteraction) => Promise<void>;

}