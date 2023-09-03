/*
    SQL
    Function for connecting to and querying the Shibe SQL database
    Copyright (C) 2023 Kaimund
*/

import { Connection, Request, ConnectionConfig } from 'tedious';
import { getSystemConfig } from './SystemDirectory';

namespace sql {
    /**
     * Sanitize your strings before querying the SQL database to prevent SQL injection attacks!
     * @param input Unsanitized string
     * @returns Sanitized string: quotes ' will become double singlequotes '', and two or more dashes together -- will be converted into a single dash -
     */
    export function sanitize(input: string): string {
        if (input) {
            return input.replace(/\'/g, '\'\'').replace(/- (\s*-)+/g, '-');
        } else {
            return null;
        }
    }

    /**
     * Run an SQL query against the Shibe database
     * @param query The SQL query to submit
     * @returns Data obtained from the SQL database, in JSON
     */
    export function query(query: string): Promise<Array<object>> {
        return new Promise ((resolve, reject) => {
            /**
             * Shibe Discord bot system configuration
             */
            const systemConfig = getSystemConfig();

            /**
             * Connection parameters for connecting to the Shibe Microsoft SQL Server
             */
            const dbConfig: ConnectionConfig = {
                server: systemConfig.data.server,
                authentication: {
                    type: 'default',
                    options: {
                        userName: systemConfig.data.username,
                        password: process.env.DB_PASSWORD
                    }
                },
                options: {
                    encrypt: systemConfig.data.useEncryption,
                    database: systemConfig.data.database,
                    connectTimeout: 1500,
                    requestTimeout: 1500
                }
            };

            /**
             * The connection to the SQL server
             */
            const connection = new Connection(dbConfig);

            /**
             * Execute the SQL query once the connection is established
             */
            connection.on('connect', function (error) {
                if (error) {
                    return reject(new Error('Failed to connect to the Shibe SQL server! ' + error));
                } else {
                    /**
                     * The request object that contains the query
                     */
                    const request = new Request(query, function (error) {
                        if (error) {
                            return reject(new Error('Failed to execute SQL query! ' + error));
                        }
                    });

                    /**
                     * Outputted result from SQL query
                     */
                    const result: Array<object> = [];

                    // Add data to result for each row returned
                    request.on('row', function (columns) {
                        const row: object = {};
                        columns.forEach(function (column) {
                            row[column.metadata.colName] = column.value;                    
                        });
                        result.push(row);
                    });
            
                    // Close the connection after the final event emitted by the request, after the callback passes
                    request.on('requestCompleted', function () {
                        connection.close();
                        resolve(result);
                    });

                    // Actually execute the query from the request we created
                    connection.execSql(request);
                }
            });

            /**
             * Connect to the SQL server
             */
            connection.connect();
        });
    }
}

export = sql;