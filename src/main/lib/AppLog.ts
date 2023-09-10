/*
    AppLog
    Enhanced logging of Shibe Discord app events.
    Copyright (C) 2023 Kaimund
*/ 

import sql from './SQL';

namespace AppLog {

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

    export function warning (message: string, causedBy?: string, dontLog?: boolean) {
        console.log(`\x1b[33m[${new Date().toString()}] [WARN] ${message}\x1b[0m`);
        if (causedBy) console.log(`\x1b[33mCaused by: ${causedBy}\x1b[0m`);

        // Log to the Viewable Event Log
        if (!dontLog) {
            const event: EvLogEntry = {
                date : new Date().getTime(),
                message : message.toString(),
                type : 'WARNING',
                causedBy: causedBy
            };
            
            sql.query(`INSERT INTO EventLog VALUES ('${event.date}', '${sql.sanitize(event.message)}', '${event.type}', '${sql.sanitize(event.causedBy)}', '')`).catch((error) => {
                AppLog.error(new Error('Couldn\'t log this warning: ' + error), 'AppLog', true);
            });
        }
    }

    export function error (message: Error, causedBy?: string, dontLog?: boolean) {
        console.log(`\x1b[31m[${new Date().toString()}] [ERROR] ${message.stack}\x1b[0m`);
        if (causedBy) console.log(`\x1b[31mCaused by: ${causedBy}\x1b[0m`);
        
        // Log to the Viewable Event Log
        if (!dontLog) {
            let stacktrace: string;
            if (message instanceof Error) stacktrace = message.stack;
            const event: EvLogEntry = {
                date : new Date().getTime(),
                message : message.toString(),
                type : 'ERROR',
                causedBy: causedBy,
                stack: stacktrace
            };
            
            sql.query(`INSERT INTO EventLog VALUES ('${event.date}', '${sql.sanitize(event.message)}', '${event.type}', '${sql.sanitize(event.causedBy)}', '${sql.sanitize(event.stack)}')`).catch((error) => {
                AppLog.error(new Error('Couldn\'t log this error: ' + error), 'AppLog', true);
            });
        }
    }

    export function fatal (message: string) {
        console.log(`\x1b[41m\x1b[37m[${new Date().toString()}] [FATAL] ${message}\x1b[0m`);
    }

}

interface EvLogEntry {
    date: number;
    message: string;
    type: EventType;
    causedBy?: string;
    stack?: string;
}

type EventType = 'FATAL' | 'ERROR' | 'WARNING' | 'INFO' | 'LOG' | 'SUCCESS' | 'TRACE';

export = AppLog;