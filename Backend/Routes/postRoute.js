import express from 'express';
import Announcement from '../models/announcement.js';


const router = express.Router();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  jwt.verify(token, process.env.JWT_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token." });
    }
    console.log("Decoded user payload:", user); // Debugging
    req.user = user; // Attach the user payload to the request object
    next();
  });
};

// Backend: government

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
      post.reactions.userReactions = post.reactions.userReactions.
      filter(
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
        console.log(post.reactions.likes);
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

       // Get updated user reaction state
       const userReaction = post.reactions.userReactions.find(r => r.userId === userId)?.reaction || null;

    res.json({
      reactions: {
        likes: post.reactions.likes,
        dislikes: post.reactions.dislikes
      },
      userReaction
    });
  } catch (error) {
    console.error('Handle reaction error:', error);
    res.status(500).json({ message: 'Error handling reaction' });
  }
});


// Create Announcement
router.post('/create', authenticateToken, async (req, res) => {
  try {
    console.log("create");
    console.log("Received data:", req.body);
    console.log("Received file:", req.file);
    const { department, title, message,time,imageUri } = req.body;
    const access = req.user.username;
    console.log(req.user.username)

    // Validate required fields
    if (!department || !title || !message ) {
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
      imageUri,
      reactions: {
        likes: 0,
        dislikes: 0,
        comments: []
      },
      time: parsedTime,
      access,
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
router.delete('/delete/:postId', async (req, res) => {
  try {
    const {postId } = req.params;
    console.log("delete post");
    // Find and delete the announcement by its ID
    const deletedAnnouncement = await Announcement.findByIdAndDelete(postId);

    if (!deletedAnnouncement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    return res.status(200).json({
      message: 'Post deleted successfully!',
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
    const { access } = req.query;
    console.log(access);
  const accessArray = Array.isArray(access) ? access : [access]; // Handle single or multiple values
  const announcements = await Announcement.find({ access: { $in: accessArray } }).sort({ createdAt: -1 });
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
router.post('/:postId/comments', async (req, res) => {
  console.log("add comment");
  try {
    const { username, message } = req.body;

    // Input validation
    if (!username || !message) {
      return res.status(400).json({ 
        message: 'Username and message are required' 
      });
    }
    const post = await Announcement.findById(req.params.postId);
    console.log(post.reactions.comments);
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

    
    
    // Sort comments by createdAt in descending order (latest first)
    const sortedComments = post.reactions.comments.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    res.json({ comments: sortedComments });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comments', error });
  }
});


export default router;
    