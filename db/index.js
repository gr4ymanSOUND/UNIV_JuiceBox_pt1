// import the pg module, destructuring the Client constructor
const { Client } = require('pg');

// supply the name and location of the database to the Client constructer we got from the pg module
// methods from this client variable will be used elsewhere to connect to, interact with, and disconnect from the database
const client = new Client('postgres://localhost:5432/juicebox-dev');

// ---------> helper functions

// queries the client for all of the users
async function getAllUsers() {
    const { rows } =  await client.query(
        `SELECT id, username
        FROM users;
        `
    );
    return rows;
}

// creates a new user in the users table
async function createUser({ username, password }) {
    try {
        // this query call uses interpolated values as a second argument (in an array)
        // you call them in the string with $indexvalue
        const { rows } = await client.query(`
            INSERT INTO users(username, password)
                VALUES ($1, $2)
                ON CONFLICT (username) DO NOTHING
                RETURNING *;
        `, [username, password]);

        return rows;
    } catch (err) {
        throw err;

    }
}



// export the client (for db connections) and other helper functions
module.exports = {
    client,
    getAllUsers,
    createUser,
}