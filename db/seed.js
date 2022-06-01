// require the client we exported from the index.js file
const { 
    client,
    getAllUsers,
    createUser
} = require('./index');

// function that calls a query to drop all tables from the database
async function dropTables() {
    try {
        console.log('Starting to drop tables...');

        await client.query(`
            DROP TABLE IF EXISTS users;
        `);

        console.log('Finished dropping tables!');

    } catch (err) {
        throw err; // this passes the error up the chain to the function that called dropTables
    }
}

// function that calls a query which creates all the tables for the database
async function createTables() {
    try {
        console.log('Starting to build tables...');

        await client.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username varchar(255) UNIQUE NOT NULL,
                password varchar(255) NOT NULL
            );
        `);

        console.log('Finished building tables!');

    } catch (err) {
        throw err; // pass the error up the chain
    }
}

// function that creates the initial test users in the table 
async function createInitialUsers() {
    try {
        console.log('Starting to create users...');

        const albert = await createUser({ username: 'albert', password: 'bertie99' });
        const sandra = await createUser({ username: 'sandra', password: '2sandy4me' });
        const glamgal = await createUser({ username: 'glamgal', password: 'soglam' });

        console.log(albert, sandra, glamgal);

        console.log('Finished creating users!')
    } catch (err) {
        console.error('Error creating users!');
        throw err;
    }
}

// function that uess the two helpers above to rebuild the database with clean data
async function rebuildDB() {
    try {
        // connect to the client first so we can interact with the database
        client.connect();

        // call the helper functions that drop and create the tables
        await dropTables();
        await createTables();
        await createInitialUsers();

    } catch (err) {
        console.error(err);
    }
    // finally {
    //     // close the client connection
    //     client.end();
    // }
}

// test the DB connection and log the users to the console
async function testDB() {
    try {
        // this is how to actually connect to the database
        // take this out after setting up the chain of rebuilding and testing at the bottom of the file
        // client.connect();

        // queries are promises, so we can/must await them inside an async function to use them effectively
        // const { rows } = await client.query(`SELECT * FROM users;`);

        console.log('Starting to test database...');

        // using the imported helper function to get all users
        const users = await getAllUsers();

        // for now, just console.log() the results
        // console.log(rows);
        console.log('getAllUsers:', users);

        console.log('Finished database tests!');


    } catch (err) {
        console.error('Error testing the database!');
        throw err;
    } 
    // finally {
    //     // close out the client connection after each interaction
    //     client.end();

    //     // this is important for security and likely for database performance as well when there will be multiple client connections
        
    // }
}

rebuildDB()
    .then(testDB)
    .catch(console.err)
    .finally(() => client.end());