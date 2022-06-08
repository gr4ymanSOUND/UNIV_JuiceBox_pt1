const express = require('express');
const apiRouter = express.Router();

// require the usersRouter we created in users.js, and then use it inside the apiRouter middleware so that the users file can handle all users API requests 
const usersRouter = require('./users');
apiRouter.use('/users', usersRouter);

const postsRouter = require('./posts');
apiRouter.use('/posts', postsRouter);

const tagsRouter = require('./tags');
apiRouter.use('/tags', tagsRouter);

module.exports = apiRouter;