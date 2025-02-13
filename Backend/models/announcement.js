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
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Announcement = mongoose.model('Announcement', announcementSchema);
export default Announcement;