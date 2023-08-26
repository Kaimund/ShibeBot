/*
    web
    The Shibe REST API manager
    Copyright (C) 2023 Kaimund600
*/

// Import Modules for Web Service
import express, { NextFunction } from 'express';

// Create Index Router for Main Events
import indexRouter from './routes/index';

// Start the Web App
const app = express();

// Configure Express to use certain modules
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Use the Index router for files on the root directory.
app.use('/', indexRouter);

// Catch any 404 errors
app.use(function(req: express.Request, res: express.Response, next: NextFunction) {
  if (!res.headersSent) {
    res.statusCode = 404;
    res.send({
        'message': '404: NOT FOUND',
        'code': 0
    });
    next();
  }
});
  
// Error handler
app.use(function(err: ResponseError, req: express.Request, res: express.Response, next: NextFunction) {
	res.locals.message = err.message;
	res.locals.error = err;

  // Render the error page
  if (!res.headersSent) {
    res.status(err.status || 500);
    res.render('error');
  }
	next();
});

export = app;

// Handle HTTP Errors
interface ResponseError {
	status?: number;
	message: string;
}