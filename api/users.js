const express = require('express');
const usersRouter = express.Router();
const { getAllUsers, getUserByUsername, createUser } = require('../db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

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

usersRouter.post('/login', async (req, res, next) => {
    const { username, password } = req.body;

    // request must have both, otherwise send on an error
    if (!username || !password) {
        next({
            name: 'MissingCredentialsError',
            message: 'Please supply both a username and password'
        });
    }

    try {
        // retrieve the user
        const user = await getUserByUsername(username);

        // check if the username and password match
        if (user && user.password == password) {
            //create token & return to user
            const token = jwt.sign({
                id: user.id,
                username
            }, JWT_SECRET);

            res.send({
                message: "You're logged in!",
                token
            });

        } else {
            next({
                next: 'IncorrectCredentialsError',
                message: 'Username or password is incorrect'
            });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }

});

usersRouter.post('/register', async (req, res, next) => {
    // destructure the pieces of the request body
    const { username, password, name, location } = req.body;
  
    try {

      // get the user object using the username
      const _user = await getUserByUsername(username);
  
      // if the user exists, we send an error to the next middleware
      if (_user) {
        next({
          name: 'UserExistsError',
          message: 'A user by that username already exists'
        });
      }
  
      // create the new user
      const user = await createUser({
        username,
        password,
        name,
        location,
      });
  
      // create the token and send it back (using an expiration date this time, cuz why not)
      const token = jwt.sign({ 
        id: user.id, 
        username
      }, JWT_SECRET, {
        expiresIn: '1w'
      });
  
      res.send({ 
        message: "Thanks for signing up!",
        token 
      });
    } catch ({ name, message }) {
      // this catches the error we created earlier and passes it to the next middleware
      next({ name, message })
    } 
  });

module.exports = usersRouter;