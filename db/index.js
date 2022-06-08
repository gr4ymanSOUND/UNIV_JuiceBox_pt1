// import the pg module, destructuring the Client constructor
const { Client } = require('pg');

// supply the name and location of the database to the Client constructer we got from the pg module
// methods from this client variable will be used elsewhere to connect to, interact with, and disconnect from the database
const client = new Client('postgres://localhost:5432/juicebox-dev');


// ---------> helper functions <----------


//>>>>>> user methods <<<<<<

// queries the client for all of the users
async function getAllUsers() {
    try {
        const { rows } =  await client.query(`
            SELECT id, username, name, location, active
            FROM users;
        `);
        return rows;
    } catch (err) {
        console.log('error getting all users');
        throw err;
    }
}

// creates a new user in the users table
async function createUser({
    username,
    password,
    name,
    location
}) {
    try {
        // this query call uses interpolated values as a second argument (in an array)
        // you call them in the string with $indexvalue
        const { rows: [ user ] } = await client.query(`
            INSERT INTO users(username, password, name, location)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (username) DO NOTHING
            RETURNING *;
        `, [username, password, name, location]);

        return user;
    } catch (err) {
        console.log('error creating a user');
        throw err;
    }
}

// updates a user record in the users table
// set a default of an empty object for the fields argument
async function updateUser(id, fields = {}) {

    // build the "set" string
    // SET username=$1, password=$2, name=$3, location=$4, etc...
    const setString = Object.keys(fields).map(
        (key, index) => `"${ key }"=$${ index + 1 }`
    ).join(', ');
    
    // return out of the function early if we don't have any fields
    if (setString.length === 0) {
        return;
    }

    // now the actual query
    // the Object.values(fields) passes in the field object's values as an array to be substituted into the setString
    try {
        const { rows: [ user ] } = await client.query(`
            UPDATE users
            SET ${ setString }
            WHERE id=${ id }
            RETURNING *;
        `, Object.values(fields));

        return user;
    } catch (err) {
        console.log('error updating a user');
        throw err;
    }

}

// get a specific user's information by ID
async function getUserById(userId) {
    try {
        const { rows: [ user ] } = await client.query(`
            SELECT id, username, name, location, active
            FROM users
            WHERE id=${ userId }
        `);

        // if there is no user, return early
        if (!user) {
            return null
        }

        // add the posts as a key: value pair to the user object
        user.posts = await getPostsByUser(userId);

        return user;
    } catch (err) {
        console.log('error getting a user by id');
        throw err;
    }
}


// >>>>>> post methods <<<<<<

// create a new post
async function createPost({
    authorId,
    title,
    content,
    tags = []
}) {
    try {
        const { rows: [ post ] } = await client.query(`
            INSERT INTO posts("authorId", title, content)
            VALUES ($1, $2, $3)
            RETURNING *;
        `, [ authorId, title, content ]);

        // create the tags for the post
        const tagList = await createTags(tags);

        // add the tags to the post and return the result
        return await addTagsToPost(post.id, tagList);
    } catch (err) {
        console.log('error creating a post');
        throw err;
    }
}

// update a post 
async function updatePost( postId, fields = {}) {
    // read the exist tags and remove the field so we can re-add it later
    const { tags } = fields;
    delete fields.tags;

    // create the "SET" string
    const setString = Object.keys(fields).map(
        (key, index) => `"${ key }"=$${ index + 1 }`
    ).join(', ');
    
    try {

        // update any fields that need updating
        if (setString.length > 0) {
            await client.query(`
            UPDATE posts
            SET ${ setString }
            WHERE id=${ postId }
            RETURNING *;
        `, Object.values(fields));
        }

        // return early there are no tags to update
        if (tags === undefined) {
            return await getPostById(postId);
        }

        // make new tags if needed
        const tagList = await createTags(tags);
        const tagListIdString = tagList.map(
            tag => `${ tag.id }`
        ).join(', ');

        // delete any post_tags records from the database which aren't in the tagList
        await client.query(`
            DELETE FROM post_tags
            WHERE "tagId"
            NOT IN (${ tagListIdString })
            AND "postId"=$1
        `, [postId]);

        // then create new post_tags as needed
        await addTagsToPost(postId, tagList);

        // return the post with all info
        return await getPostById(postId);

    } catch (err) {
        console.log('error updating a post');
        throw err;
    }
}

// get all of the posts
async function getAllPosts() {
    try {
        const { rows: postIds } =  await client.query(`
            SELECT id
            FROM posts;
        `);

        const posts = await Promise.all(postIds.map(
            post => getPostById( post.id )
        ));

        return posts;
    } catch (err) {
        console.log('error getting posts');
        throw err;
    }
}

// get posts made by a specific user
async function getPostsByUser(userId) {
    try {
        const { rows: postIds } = await client.query(`
            SELECT id
            FROM posts
            WHERE "authorId"=${ userId };
        `);

        const posts = await Promise.all(postIds.map(
            post => getPostById( post.id )
        ));
       
        return posts;
    } catch (err) {
        console.log('error getting posts by user');
        throw err;
    }
}

// create tags for the posts
async function createTags(tagList) {
    // leave early if there are no tags to create
    if (tagList.length === 0) {
        return;
    }

    // create a string to use in the "VALUES" section of the insert when adding tags
    // leave off starting and ending parenthesis
    // $1), ($2), ($3
    const insertValues = tagList.map(
        (_, index) => `$${ index + 1 }`).join('), (');

    // then for pulling the values with "IN" in the select
    // $1, $2, $3
    const selectValues = tagList.map(
        (_, index) => `$${ index +1 }`).join(', ');

    try {

        // add the new tags, using the insertValues string as the value
        await client.query(`
            INSERT INTO tags(name)
            VALUES (${insertValues})
            ON CONFLICT (name) DO NOTHING;
        `, tagList)

        // retrieve all of the tags in the tags table
        const { rows } = await client.query(`
            SELECT * FROM tags
            WHERE name
            IN (${selectValues})
        `, tagList)

        return rows;

    } catch (err) {
        console.log('error creating the tags entries')
        throw err;
    }


}

// creates a record in the post_tags table to add a tag to a specific post
async function createPostTag(postId, tagId) {
    try {
        await client.query(`
            INSERT INTO post_tags("postId", "tagId")
            VALUES ($1, $2)
            ON CONFLICT ("postId", "tagId") DO NOTHING;
        `, [postId, tagId]);

    } catch (err) {
        console.log('error creating post_tags entries')
        throw err;
    }
}

// gets a specific post and all of the relevant information using the ID
async function getPostById(postId) {
    try {

        // first get the post itself
        const { rows: [ post ] } = await client.query(`
            SELECT *
            FROM posts
            WHERE id=$1;
        `, [postId]);

        // then get the tags; use a JOIN to use the post_tags table to only pull the tags associated with this postId
        const { rows: tags } = await client.query(`
            SELECT tags.*
            FROM tags
            JOIN post_tags ON tags.id=post_tags."tagId"
            WHERE post_tags."postId"=$1;
        `, [postId]);

        // finally, get the author's information from the users table
        const { rows: [ author ] } = await client.query(`
            SELECT id, username, name, location
            FROM users
            WHERE id=$1;        
        `, [post.authorId]);

        // add the tags and the author info as key: value pairs to the post object
        post.tags = tags;
        post.author = author;

        // remove the authorId from the post since we also include the whole author property
        delete post.authorId;

        // make sure to return the whole post!
        return post;
    } catch (err) {
        console.log('error getting a post by ID');
        throw err;
    }
}

// actually adds the list of tags to a post
async function addTagsToPost(postId, tagList) {
    try {
        // map through the tagList and run createPostTag for each item
        // since createPostTag is async, we're collecting the returned promises from createPostTag in an array
        const createPostTagPromises = tagList.map(
            tag => createPostTag(postId, tag.id)
        );

        // awaiting Promise.all allows us to wait until all promises in that array are returned before moving on
        await Promise.all(createPostTagPromises);

        // we want to return the record of the post after adding the tags
        return await getPostById(postId);
    } catch (err) {
        console.log('error error adding tags to the post');
        throw err;
    }
}

// get a list of all tags
async function getAllTags() {
    try {
        const { rows } = await client.query(`
            SELECT *
            FROM tags;
        `);
        console.log('tags output', rows)
        return rows;
    } catch (err) {
        console.log('error getting all tags');
        throw err;
    }
}

// get a list of posts that have a given tag
async function getPostsByTagName(tagName) {
    try {

        //select the posts, and join with post_tags and tags so that we can access the tag names for each post
        // then filter the results to only include posts that have the specified tag name
        const { rows: postIds } = await client.query(`
            SELECT posts.id
            FROM posts
            JOIN post_tags ON posts.id=post_tags."postId"
            JOIN tags ON tags.id=post_tags."tagId"
            WHERE tags.name=$1
        `, [tagName]);

        return await Promise.all(postIds.map(
            post => getPostById(post.id)
        ));

    } catch (err) {
        console.log('error retrieving posts using a tag name')
        throw err;
    }
}

// export the client (for db connections) and other helper functions
module.exports = {
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
    getPostsByTagName,
    getAllTags
}