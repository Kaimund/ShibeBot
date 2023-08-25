/*
    AppLog
    Enhanced logging of Shibe Discord app events.
    Copyright (C) 2023 Kaimund
*/ 

import fs from 'fs';

export namespace AppLog {

    export function trace (message: string) {
        if (process.argv.includes('-v')) console.log(`[${new Date().toString()}] [INFO] ${message}\x1b[0m`);
    }

    export function log (message: string) {
        console.log(`[${new Date().toString()}] [INFO] ${message}\x1b[0m`);
    }

    export function success (message: string) {
        console.log(`\x1b[32m[${new Date().toString()}] [ OK ] ${message}\x1b[0m`);
    }

    export function info (message: string) {
        console.log(`\x1b[34m[${new Date().toString()}] [INFO] ${message}\x1b[0m`);
    }

    export async function warning (message: string, causedBy?: string, dontLog?: boolean) {
        console.log(`\x1b[33m[${new Date().toString()}] [WARN] ${message}\x1b[0m`);
        if (causedBy) console.log(`\x1b[33mCaused by: ${causedBy}\x1b[0m`);

        // Log to the Viewable Event Log
        try {
                if (!dontLog) {
                const evLog: EvLog | void = await getEvLog().catch(error => error('Couldn\'t log this warning: ' + error, 'AppLog', true));
                if (evLog) {
                    evLog[Date.now()] = {
                        date: new Date().toString(),
                        message : message.toString(),
                        type : 'WARNING',
                        causedBy: causedBy
                    };
                    fs.writeFileSync('./db/event-log.json', JSON.stringify(evLog));
                }
            }
        } catch (err) {
            error(new Error('Couldn\'t log this warning: ' + err), 'AppLog', true);
        }
    }

    export async function error (message: Error, causedBy?: string, dontLog?: boolean) {
        console.log(`\x1b[31m[${new Date().toString()}] [ERROR] ${message.stack}\x1b[0m`);
        if (causedBy) console.log(`\x1b[31mCaused by: ${causedBy}\x1b[0m`);
        
        // Log to the Viewable Event Log
        try {
            if (!dontLog) {
                const evLog: EvLog | void = await getEvLog().catch(error => error('Couldn\'t log this error: ', 'AppLog', true));
                if (evLog) {
                    let stacktrace: string;
                    if (message instanceof Error) stacktrace = message.stack;
                    evLog[Date.now()] = {
                        date : new Date().toString(),
                        message : message.toString(),
                        type : 'ERROR',
                        causedBy: causedBy,
                        stack: stacktrace
                    };
                    fs.writeFileSync('./db/event-log.json', JSON.stringify(evLog));
                }
            }
        } catch (err) {
            error(new Error('Couldn\'t log this error: ' + err), 'AppLog', true);
        }
    }

    export function fatal (message: string) {
        console.log(`\x1b[41m\x1b[37m[${new Date().toString()}] [FATAL] ${message}\x1b[0m`);
    }

}

export async function getEvLog(): Promise<EvLog> {
    return new Promise ((resolve, reject) => {
        // Root DB Directory
        if (!fs.existsSync('./db/')) {
            AppLog.info('Could not find the database directory. Creating a new one...');
            try {
                fs.mkdirSync('./db/');
            } catch (err) {
                reject(new Error('Failed to create the root database directory: ' + err));
            }
        }
        // Error Log
        if (!fs.existsSync('./db/event-log.json')) {
            try {
                fs.writeFileSync('./db/event-log.json', JSON.stringify({}));
            } catch (err) {
                reject(new Error('Cannot create new event log file: ' + err));
            }
           
        }
        // Read the file
        try {
            const data = fs.readFileSync('./db/event-log.json', 'utf8');
            if (data) {
                // Try to parse
                try {
                    const parsedData = JSON.parse(data);
                    resolve(parsedData);
                } catch (err) {
                    reject(new Error('Your event log is corrupted. ' + err));
                }
            } else reject(new Error('Your event log cannot be accessed.'));
        } catch (err) {
            reject(new Error('Cannot retreive event log: ' + err));
        }
    });
}

export interface EvLog {
    [time: number]: EvLogEntry;
};

interface EvLogEntry {
    date: string;
    message: string;
    type: EventType;
    causedBy?: string;
    stack?: string;
}

type EventType = 'FATAL' | 'ERROR' | 'WARNING' | 'INFO' | 'LOG' | 'SUCCESS' | 'TRACE';