const express = require('express');
const apiRouter = express.Router();
const jwt = require('jsonwebtoken');
const { getUserById } = require('../db');
const { JWT_SECRET } = process.env;

// set 'req.user' if possible
// this means verifying the jwt
apiRouter.use(async (req, res, next) => {
    const prefix = 'Bearer ';
    const auth = req.header('Authorization');

    if (!auth) {
        // if the auth isn't set, skip the rest of this
        next();
    } else if (auth.startsWith(prefix)) {
        // of if the auth header is set and it starts with bearer
        const token = auth.slice(prefix.length);

        // try to read/decrypt the token
        try {
            const { id } = jwt.verify(token, JWT_SECRET);

            // if the verify was successful, get the user information
            if(id) {
                req.user = await getUserById(id);
                next();
            }
        } catch ({ name, message }) {
            next({ name, message });
        }
    } else {
        next({
            name: 'AuthorizationHeaderError',
            message: `Authoriztion token must start with ${ prefix }`
        });
    }
});

apiRouter.use((req, res, next) => {
    if (req.user) {
        console.log('User is set:', req.user);
    }

    next();
})

// require the usersRouter we created in users.js, and then use it inside the apiRouter middleware so that the users file can handle all users API requests 
const usersRouter = require('./users');
apiRouter.use('/users', usersRouter);

const postsRouter = require('./posts');
apiRouter.use('/posts', postsRouter);

const tagsRouter = require('./tags');
apiRouter.use('/tags', tagsRouter);


// error handling middleware
apiRouter.use((error, req, res, next) => {
    res.send({
        name: error.name,
        message: error.message
    });
});

module.exports = apiRouter;