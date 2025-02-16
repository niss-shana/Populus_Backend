import mongoose from 'mongoose';

const surveySchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  question: { 
    type: String, 
    required: true 
  },
  options: { 
    type: [String], 
    required: true,
    validate: {
      validator: function (options) {
        return options.length >= 2 && options.length <= 4; // Ensure 2 to 4 options
      },
      message: 'Survey must have between 2 and 4 options.'
    }
  },
  creator: { 
    type: String, 
    required: true 
  },
  profile: { 
    type: String, 
    required: true 
  },
  active: { 
    type: Boolean, 
    default: true // Set default value here
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const Survey = mongoose.model('Survey', surveySchema);

export default Survey;