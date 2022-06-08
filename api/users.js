const express = require('express');
const usersRouter = express.Router();
const { getAllUsers } = require('../db');

usersRouter.use((req, res, next) => {
    console.log('A request is being made to /users');
    next();
});

// this route handles the api/users/ route with a GET request
usersRouter.get('/', async (req, res) => {
    // use the imported getAllUsers function from the db/index.js file and use it to pull all users
    const users = await getAllUsers();

    // send the array of user objects back to the client
    res.send({
        users
    });
});

module.exports = usersRouter;