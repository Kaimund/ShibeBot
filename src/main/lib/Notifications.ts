/*
    Notifications
    Get a collection of user notifications
    Copyright (C) 2023 Kaimund
*/

export function getNotifications(userID: string) {
    
    return new Notifications(userID);

}

export class Notifications {

    userNotifications: UserNotifications;
    serverNotifications: ServersNotifications;
    // Developer Notifications: count of system alerts, check first to make sure they're sys admin

    constructor (userID: string) {
        this.userNotifications = new UserNotifications(userID);
    }

}

class UserNotifications {
    
    userID: string;
    
    total: NotificationGroup;

    constructor(userID: string) {

        this.userID = userID;

        this.total = new NotificationGroup();

    }
}

class ServersNotifications {
    userID: string;

    total: NotificationGroup;

    servers: Map<string, ServerNotifications>;

    constructor(userID: string) {

        this.userID = userID; 

        this.total = new NotificationGroup();

        this.servers = new Map();

        // Get an array of servers the user has access to
        // For each server, add an entry to the map and initialise (by creating a new Server Notifications)

    }

}

class ServerNotifications {

    userID: string;
    serverID: string; 

    total: NotificationGroup;

    constructor(userID: string, serverID: string) {

        this.userID = userID;
        this.serverID = serverID;

    }

}

class NotificationGroup {

    private total: number;

    private important: number;
    private warning: number;
    private info: number;
    private success: number;
    private normal: number;

    constructor(important?: number, warning?: number, info?: number, success?: number, normal?: number) {
        important ? this.important = important : this.important = 0;
        warning ? this.warning = warning : this.warning = 0;
        info ? this.info = info : this.info = 0;
        success ? this.success = success : this.success = 0; 
        normal ? this.normal = normal : this.normal = 0;
        this.total = this.important + this.warning + this.info + this.success + this.normal;
    }

    count(type?: NotificationType) {
        if (type) {
            switch (type) {
                case 'IMPORTANT': return this.important;
                case 'WARNING': return this.warning;
                case 'INFO': return this.info;
                case 'SUCCESS': return this.success;
                case 'NORMAL': return this.normal;
            }
        }

        return this.total;
    }

    increase(type: NotificationType, amount?: number) {
        if (!amount) amount = 1;
        switch (type) {
            case 'IMPORTANT': this.important + amount; break;
            case 'WARNING': this.warning + amount; break;
            case 'INFO': this.info + amount; break;
            case 'SUCCESS': this.success + amount; break; 
            case 'NORMAL': this.normal + amount; break;
        }
        this.total + amount;

        return this;
    }

    badge() {
        if (this.important) return `<span class="badge badge-important">${this.count()}</span>`;
        else if (this.warning) return `<span class="badge badge-warning">${this.count()}</span>`;
        else if (this.info) return `<span class="badge badge-info">${this.count()}</span>`;
        else if (this.success) return `<span class="badge badge-success">${this.count()}</span>`;
        else if (this.normal) return `<span class="badge">${this.count()}</span>`;
        else return '';
    }

}

type NotificationType = 'IMPORTANT' | 'WARNING' | 'INFO' | 'SUCCESS' | 'NORMAL';