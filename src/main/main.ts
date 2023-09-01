#!/usr/bin/env node
/*
    main
    The main Shibe process root
    Copyright (C) 2023 Kaimund
*/

/**
 * Welcome Text
 */
console.log('Shibe - A heccin Discord bot by Kaimund');

/**
 * Initial Setup
 */
import dotenv from 'dotenv';
dotenv.config(); 

/**
 * Load initial modules
 */
import fs from 'fs';
import { AppLog } from './helpers/AppLog';
import { getSystemConfig } from './helpers/SystemDirectory';

/**
 * Handle unhandled promise rejections - this should prevent the app from crashing if there is a bug
 */
process.on('unhandledRejection', (error) => {
    AppLog.error(new Error('An unhandled promise rejection has occurred! This indicates a serious bug in the code. Please report this issue.\n' + error), 'Unhandled Promise Rejection');
});

/**
 * The system configuration file
 */
const systemConfig = getSystemConfig();

// Check to see if the super secret .env file which holds bot tokens exists. If it doesn't, create one. 
if (!fs.existsSync('./.env')) {
    AppLog.info('Could not find the Shibe environment variables file. Creating a new one...');

    try {
        fs.writeFileSync('./.env', 'BOT_TOKEN=\nDB_PASSWORD=');
    } catch (err) {
        AppLog.fatal('Cannot create new environment variables file: ' + err);
        AppLog.fatal('This configuration file is REQUIRED for Shibe to run, and Shibe cannot continue starting without it. Shibe will now exit.');
        process.exit(1);
    }
}

if (!process.env.DB_PASSWORD) {
    AppLog.warning('You have not set a password for the Shibe database. Shibe will not be able to log in to the database without it. Please open the .env file and enter the password for your database user in the DB_PASSWORD line, then start Shibe again.', 'App Startup');
}

// If the bot token is not set, stop the process and prompt the user to set it.
if (!process.env.BOT_TOKEN) {
    AppLog.fatal('You have not set your bot token yet. Please open the .env file and paste your bot token in the BOT_TOKEN line, then start Shibe again.');
    process.exit(1);
}

/**
 * Import the rest of the modules
 */
import './discord/discord'; // Discord
import api from './api/api'; // Shibe API
import http from 'http';
import debug from 'debug';

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(systemConfig.apiPort);

/**
 * Create HTTP server.
 */
const server = http.createServer(api);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            AppLog.fatal(bind + ' requires elevated privileges');
            process.exit(1);
        case 'EADDRINUSE':
            AppLog.fatal(bind + ' is already in use');
            process.exit(1);
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
    const addr = server.address();
    const bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}