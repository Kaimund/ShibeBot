/*
    shard
    Initial code called when a new shard is created
    Copyright (C) 2023 Kaimund
*/

import Shibe, { StatusFlag } from './core/Shibe';
import { getEvLog, EvLog } from '../helpers/AppLog';

class App {
    shibe: Shibe;

    constructor () {
        this.shibe = new Shibe();
    }

    start() {
        this.shibe.start();
    }

    didStartSuccessfully(): Promise<boolean> {
        return new Promise(resolve => {
            const shibeServiceStartCheck = setInterval(() => {
                switch (this.shibe.startupStatus) {
                    case StatusFlag.Successful:
                        clearInterval(shibeServiceStartCheck);
                        resolve(true);
                        break;
                    case StatusFlag.Failed:
                        clearInterval(shibeServiceStartCheck);
                        resolve(false);
                        break;
                    case StatusFlag.Errored:
                        clearInterval(shibeServiceStartCheck);
                        resolve(false);
                        break;
                }
            }, 1000);
        });
    }

    getEventLog(): Promise<EvLog> {
        return new Promise(async (resolve, reject) => {
            const eventlog = await getEvLog().catch(err => reject(new Error('Cannot get Event Log: ' + err)));
            if (!eventlog) return;
            resolve(eventlog);
        });
    }
}

const app = new App();
app.start();
export = app;