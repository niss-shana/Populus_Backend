import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const userReactionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  reaction: {
    type: String,
    enum: ['like', 'dislike'],
    required: true
  }
});

const announcementSchema = new mongoose.Schema({
  department: {
    type: String,
    required: true,
    trim: true,
  },
  time: {
    type: Date, // Changed to Date type for better time handling
    default: Date.now,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
  },
  imageUri: {
    type: String,
    required: false,
  },
  reactions: {
    likes: {
      type: Number,
      default: 0,
    },
    dislikes: {
      type: Number,
      default: 0,
    },
    comments: {
      type: [commentSchema],
      default: [] // Change this to an array of commentSchema
    },
    userReactions: {
      type: [userReactionSchema],
      default: []
    }
  
  },
  access: {
    type: [String], 
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Announcement = mongoose.model('Announcement', announcementSchema);
export default Announcement;