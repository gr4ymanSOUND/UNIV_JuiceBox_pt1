// require the client we exported from the index.js file
const { 
    client,
    createUser,
    updateUser,
    getAllUsers,
    getUserById,
    createPost,
    updatePost,
    getAllPosts,
    getPostsByUser,
    createTags,
    addTagsToPost,
    getPostsByTagName
} = require('./index');

// function that calls a query to drop all tables from the database
async function dropTables() {
    try {
        console.log('Starting to drop tables...');

        await client.query(`
            DROP TABLE IF EXISTS post_tags;
            DROP TABLE IF EXISTS tags;
            DROP TABLE IF EXISTS posts;
            DROP TABLE IF EXISTS users;
        `);

        console.log('Finished dropping tables!');

    } catch (err) {
        console.log('Error dropping tables!');
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
                password varchar(255) NOT NULL,
                name varchar(255) NOT NULL,
                location varchar(255) NOT NULL,
                active BOOLEAN DEFAULT true
            );
            CREATE TABLE posts (
                id SERIAL PRIMARY KEY,
                "authorId" INTEGER REFERENCES users(id) NOT NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                active BOOLEAN DEFAULT true
            );
            CREATE TABLE tags (
                id SERIAL PRIMARY KEY,
                name varchar(255) UNIQUE NOT NULL
            );
            CREATE TABLE post_tags (
                "postId" INTEGER REFERENCES posts(id),
                "tagId" INTEGER REFERENCES tags(id),
                UNIQUE ("postId", "tagId")
            );
        `);

        console.log('Finished building tables!');

    } catch (err) {
        console.log('Error building tables!');
        throw err; // pass the error up the chain
    }
}

// function that creates the initial test users in the table 
async function createInitialUsers() {
    try {
        console.log('Starting to create users...');

        const albert = await createUser({ username: 'albert', password: 'bertie99' , name: 'Alberto', location: 'San Juan' });
        const sandra = await createUser({ username: 'sandra', password: '2sandy4me', name: 'Alexandra', location: 'Detroit' });
        const glamgal = await createUser({ username: 'glamgal', password: 'soglam', name: 'Betty', location: 'Hollywood' });

        console.log("Users:", albert, sandra, glamgal);

        console.log('Finished creating users!')
    } catch (err) {
        console.error('Error creating users!');
        throw err;
    }
}

// creates a set of posts
async function createInitialPosts() {
    try {
        console.log('Starting to create initial posts...');

        const [ albert, sandra, glamgal ] = await getAllUsers();

        await createPost({
            authorId: albert.id,
            title: "First Post",
            content: "This is my first post. I hope you love writing blogs as much as I love writing them.",
            tags: ['#happy', '#youcandoanything' ]
        });

        await createPost({
            authorId: sandra.id,
            title: "Another Post",
            content: "This is yet another post, but this time by me - Sandra! bLoGs aRe TeH cOolEsT",
            tags: ['#happy', '#youcandoanything', '#catmandoeverything' ]
        });
        
        await createPost({
            authorId: glamgal.id,
            title: "Final Post",
            content: "NO MORE POSTS ARE ALLOWED AFTER THIS OR I'LL HAVE TO PARACHUTE INTO THE DESERT!",
            tags: ['#worst-day-ever', '#catmandoeverything' ]
        });

        console.log('Finished creating initial posts!');

    } catch (err) {
        console.log('Error creating initial posts!');
        throw err;
    }
}

// creates and adds tags to the initial posts
// --------- we refactored the createPosts function to include the tags as the post is created rather than later
// async function createInitialTags() {
//     try {
//         console.log('Starting to create and add tags...');

//         // create a tag list
//         // we destructure some variable names for use later when adding them to the posts
//         const [happy, sad, inspo, catman] = await createTags([
//             '#happy', 
//             '#worst-day-ever', 
//             '#youcandoanything',
//             '#catmandoeverything'
//         ]);

//         // store and destructure the post list
//         const [postOne, postTwo, postThree] = await getAllPosts();

//         // add the newly created tags to the posts
//         await addTagsToPost(postOne.id, [happy, inspo, catman]);
//         await addTagsToPost(postTwo.id, [catman, inspo]);
//         await addTagsToPost(postThree.id, [sad, catman]);

//         console.log('Finished creating and adding the tags!')

//     } catch (err) {
//         console.log('Error creating or adding the tags!');
//         throw err;
//     }
// }


// function that uess the two helpers above to rebuild the database with clean data
async function rebuildDB() {
    try {
        // connect to the client first so we can interact with the database
        client.connect();

        // call the helper functions that drop and create the tables
        await dropTables();
        await createTables();
        await createInitialUsers();
        await createInitialPosts();

    } catch (err) {
        console.log('Error during rebuildDB');
        throw err;
    }
    // removed this because we actually close the client in our chain of .then at the end of the file
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
        console.log('Calling getAllUsers...')
        const users = await getAllUsers();
        console.log('getAllUsers result: ', users);

        // call the updateUsers function
        console.log('Calling updateUsers on users[0]...');
        const updateUserResult = await updateUser(users[0].id, {
            name: 'Newname Sogood',
            location: 'Lesterville, KY'
        });
        console.log('updateUser Result:', updateUserResult)

        // get all the posts
        console.log("Calling getAllPosts");
        const posts = await getAllPosts();
        console.log("Result:", posts);

        // update the first post
        console.log("Calling updatePost on posts[0]");
        const updatePostResult = await updatePost(posts[0].id, {
            title: "New Title",
            content: "Updated Content"
        });
        console.log("Result:", updatePostResult);

        // get user with ID 1
        console.log("Calling getUserById with 1");
        const albert = await getUserById(1);
        console.log("Result:", albert);

        // update post[1], but only the tags
        console.log("Calling updatePost on posts[1], only updating tags");
        const updatePostTagsResult = await updatePost(posts[1].id, {
            tags: ["#youcandoanything", "#redfish", "#bluefish"]
        });
        console.log("Result:", updatePostTagsResult);

        // get all of the posts that have a specific tag
        console.log("Calling getPostsByTagName with #happy");
        const postsWithHappy = await getPostsByTagName("#happy");
        console.log("Result:", postsWithHappy);

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
    .catch(console.error)
    .finally(() => client.end());