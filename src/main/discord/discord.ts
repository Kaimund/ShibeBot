/*
    discord
    The Shibe Discord app manager
    Copyright (C) 2023 Kaimund
*/

import { AppLog } from '../helpers/AppLog';
import { ShardingManager } from 'discord.js';

const manager = new ShardingManager('./dist/main/discord/shard.js', { token: process.env.BOT_TOKEN });

manager.spawn().catch(error => {
    AppLog.error(error, 'Spawning a new shard');
});