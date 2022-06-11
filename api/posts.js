const express = require('express');
const postsRouter = express.Router();
const { getAllPosts, createPost, updatePost, getPostById } = require('../db');
const { all } = require('./users');
const { requireUser } = require('./utils')

postsRouter.use((req, res, next) => {
    console.log('A request is being made to /posts');
    next();
});


// create a new post
postsRouter.post('/', requireUser, async (req, res, next) => {
    // res.send({ message: 'under construction' });

    // destructure the request body, setting a default for tags in case it doesn't exist
    const { title, content, tags = "" } = req.body;

    // trim the whitespace from the ends of the tags string, then split it into separate tags as an array
    const tagArr = tags.trim().split(/\s+/);
    const postData = {};

    // only send the tags if there are some to send
    if (tagArr.length) {
        postData.tags = tagArr;
    }

    try {
        // add authorId, title, content to postData object
        postData.authorId = req.user.id;
        postData.title = title;
        postData.content = content;

        // this will create the post and the tags for us
        const post = await createPost(postData);

        // if the post comes back, res.send({ post });
        if (post) {
            res.send({ post });
        } else {
            // otherwise, next an appropriate error object
            next({name: 'PostCreateError', message:'Error creating the post.'})
        }

    } catch ({ name, message }) {
        next({ name, message });
    }

});

// update a single post
postsRouter.patch('/:postId', requireUser, async (req, res, next) => {
    // destructure the information we need from the request object
    const { postId } = req.params;
    const { title, content, tags } = req.body;

    // set up an object to contain the fields we are updating
    const updateFields = {};

    // if the tags field exists in the request and isn't empty, split the tags and add them to the updateFields
    if (tags && tags.length > 0) {
        updateFields.tags = tags.trim().split(/\s+/);
    }

    // if the title exists in the request, add it to the updateFields
    if (title) {
        updateFields.title = title;
    }

    // if the content is in the request, add it to the updateFields
    if (content) {
        updateFields.content = content;
    }

    try {
        // pull the original post
        const originalPost = await getPostById(postId);

        // if the post belongs to the person trying to edit it, we'll allow the update to go through and send it back to the user
        if (originalPost.author.id === req.user.id) {
            const updatedPost = await updatePost(postId, updateFields);
            res.send({ post: updatedPost })
        } else {
            //otherwise, send an error message
            next({
                name: 'UnauthorizedUserError',
                message: 'You cannot update a post that is not yours.'
            })
        }

    } catch ({ name, message }) {
        next({ name, message });
    }

})

// delete a post
postsRouter.delete('/:postId', requireUser, async (req, res, next) => {
    // destructure the postID from the parameters
    const { postId } = req.params;

    try {
        // get the post using the ID
        const post = await getPostById(postId);

        // if the post exists and the current user is the author, update the post and send it to the client
        if(post && post.author.id === req.user.id) {
            const updatedPost = await updatePost(post.id, { active: false });
            console.log('post has been deleted')
            res.send({ post: updatePost });
        } else {
            // if there is a post but it doesn't belong to the client, throw an error
            // otherwise throw an error about the post not being found
            next(post ? {
                name: 'UnauthorizedUserError',
                message: 'You cannot delete a post which is not yours.'
            } : {
                name: 'PostNotFoundError',
                message: 'That post does not exist'
            });
        }

    } catch ({ name, message }) {
        next({ name, message });
    }
});

// get all of the posts
postsRouter.get('/', async (req, res, next) => {
    try {
        const allPosts = await getAllPosts();

        // filter the result to include only active posts
        const posts = allPosts.filter(post => {
            if (post.active) {
                return true;
            }
            // also include posts that are inactive, but belong to the user
            if (req.user && post.author.id === req.user.id) {
                return true;
            }
            // be sure to return false if none of the above are true
            return false;
        });

        // cleaner way to write the filter function above
        // just return the result of the conditional, using the || (or) conditional to do both potential passing conditions
        // will skip for now, because it will be more difficult to read and edit if things get more complicated later down the line
        // "code golf" - trying to refactor code to use the smallest possible character/line/instruction count
        // const posts = allPosts.filter(post => {
        //     return post.active || (req.user && post.author.id === req.user.id);
        // })
    
        res.send({
            posts
        });

    } catch ({ name, message }) {
        next({ name, message });
    }
});


module.exports = postsRouter;