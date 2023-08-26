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
 * Load modules.
 */
import './discord/discord'; // Discord
import api from './api/api'; // Shibe API
import http from 'http';
import debug from 'debug';
import { AppLog } from './helpers/AppLog';

/**
 * Handle unhandled promise rejections - this should prevent the app from crashing if there is a bug
 */
process.on('unhandledRejection', (error) => {
    AppLog.error(new Error('An unhandled promise rejection has occurred! This indicates a serious bug in the code. Please report this issue.\n' + error), 'Unhandled Promise Rejection');
});

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(process.env.PORT || '3000');
//api.set('port', port);

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