const express = require('express');
const tagsRouter = express.Router();
const { getAllTags, getPostsByTagName } = require('../db');

tagsRouter.use((req, res, next) => {
    console.log('A request is being made to /tags');
    next();
});

tagsRouter.get('/', async (req, res) => {

    const tags = await getAllTags();

    res.send({
        tags
    });
});

tagsRouter.get('/:tagName/posts', async (req, res, next) => {
    // read the tagname from the params
    const { tagName } = req.params;

    try {
        // use the method from the db that gets posts by tag name
        const postsByTag = await getPostsByTagName(tagName);

        const activePostsByTag = postsByTag.filter(post => {
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

        // send a posts object to the client
        res.send({ posts: activePostsByTag});

    } catch ({ name, message }) {
        next({ name, message });
    }
})


module.exports = tagsRouter;