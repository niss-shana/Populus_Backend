import express from 'express';
import Announcement from '../models/announcement.js';


const router = express.Router();


// Backend: routes/announcement.ts

router.post('/:postId/reaction', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, type } = req.body; // type will be either 'like' or 'dislike'

    const post = await Announcement.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Find if user has already reacted
    const existingReaction = post.reactions.userReactions.find(
      reaction => reaction.userId === userId
    );

    // If user already reacted with the same type, remove the reaction
    if (existingReaction && existingReaction.reaction === type) {
      post.reactions.userReactions = post.reactions.userReactions.filter(
        reaction => reaction.userId !== userId
      );
      if (type === 'like') {
        post.reactions.likes--;
      } else {
        post.reactions.dislikes--;
      }
    }
    // If user already reacted with different type, update the reaction
    else if (existingReaction) {
      existingReaction.reaction = type;
      if (type === 'like') {
        post.reactions.likes++;
        post.reactions.dislikes--;
      } else {
        post.reactions.dislikes++;
        post.reactions.likes--;
      }
    }
    // If no existing reaction, add new reaction
    else {
      post.reactions.userReactions.push({ userId, reaction: type });
      if (type === 'like') {
        post.reactions.likes++;
      } else {
        post.reactions.dislikes++;
      }
    }

    await post.save();

    res.json({
      reactions: {
        likes: post.reactions.likes,
        dislikes: post.reactions.dislikes
      },
      userReaction: type
    });
  } catch (error) {
    console.error('Handle reaction error:', error);
    res.status(500).json({ message: 'Error handling reaction' });
  }
});


// Create Announcement
router.post('/create', async (req, res) => {
  try {
    console.log("create");
    console.log("Received data:", req.body);
    console.log("Received file:", req.file);
    const { department, title, message,time } = req.body;

    // Validate required fields
    if (!department || !title || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate time format
    let parsedTime = Date.now();
    if (time) {
      if (isNaN(Date.parse(time))) {
        return res.status(400).json({ error: 'Invalid time format' });
      }
      parsedTime = new Date(time);
    }
    // Create a new announcement
    const newAnnouncement = new Announcement({
      department,
      title,
      message,
      imageUri: req.file ? req.file.path : null,
      reactions: {
        likes: 0,
        dislikes: 0,
        comments: []
      },
      time: parsedTime,
      createdAt: new Date()
    });
    // Save the new announcement to the database
    await newAnnouncement.save();
    console.log("Saving announcement:", newAnnouncement);

    return res.status(201).json({
      message: 'Announcement created successfully!',
      announcement: newAnnouncement,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server Error' });
  }
});

// Delete Announcement
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete the announcement by its ID
    const deletedAnnouncement = await Announcement.findByIdAndDelete(id);

    if (!deletedAnnouncement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    return res.status(200).json({
      message: 'Announcement deleted successfully!',
      deletedAnnouncement,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server Error' });
  }
});



// Get All Announcements

router.get('/display', async (req, res) => {
 
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching announcements', error });
  }
});

router.post('/:postId/like', async (req, res) => {
  try {
    const post = await Announcement.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.reactions.likes += 1;
    await post.save();

    res.json({ message: 'Post liked', reactions: post.reactions });
  } catch (error) {
    res.status(500).json({ message: 'Error liking post', error });
  }
});

//  Dislike a Post
router.post('/:postId/dislike', async (req, res) => {
  try {
    const post = await Announcement.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.reactions.dislikes += 1;
    await post.save();

    res.json({ message: 'Post disliked', reactions: post.reactions });
  } catch (error) {
    res.status(500).json({ message: 'Error disliking post', error });
  }
});

// ✅ Add a Comment
router.post('/:postId/comment', async (req, res) => {
  try {
    const { username, message } = req.body;
    const post = await Announcement.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const newComment = {
      username,
      message,
      createdAt: new Date(),
    };

    post.reactions.comments.push(newComment);
    await post.save();

    res.json({ message: 'Comment added', comment: newComment, reactions: post.reactions });
  } catch (error) {
    res.status(500).json({ message: 'Error adding comment', error });
  }
});

// ✅ Fetch Latest Comments (Sorted)
router.get('/:postId/comments', async (req, res) => {
  try {
    const post = await Announcement.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Sorting comments in descending order (latest first)
    const sortedComments = post.reactions.comments.sort((a, b) => b.createdAt - a.createdAt);

    res.json({ comments: sortedComments });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comments', error });
  }
});
export default router;
