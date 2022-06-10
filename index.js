const PORT = 3000;
const express = require('express');
const server = express();
const { client } = require('./db');
require('dotenv').config();

// logging middleware that does basic logs each request
const morgan = require('morgan');
server.use(morgan('dev'));

// connect to the client
client.connect();

// body parser middleware - converts the request into readable json
// if the request's header is not "Content-Type: application/json", this won't really work
server.use(express.json());

server.use((req, res, next) => {
    console.log('<____Body Logger START____>');
    console.log(req.body);
    console.log('<____Body Logger END____>');
    next();
});

// require the API folder's index file, and use the apiRouter we exported from there
const apiRouter = require('./api');
server.use('/api', apiRouter);



// start the server
server.listen(PORT, () => {
  console.log('The server is up on port', PORT);
});