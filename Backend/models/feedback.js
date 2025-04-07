// models/Feedback.js

import mongoose from 'mongoose';


const feedbackSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['suggestion', 'complaint'],
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  access: {
    type: String, 
    required: true,
  },
  userId: {
    type: String, 
    required: true,
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'inProgress', 'resolved'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

 const feedback = mongoose.model('Feedback', feedbackSchema);
export default feedback;