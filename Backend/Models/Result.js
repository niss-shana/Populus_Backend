import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  surveyid: { 
    type: String, 
    required: true 
  },
  option: { 
    type: String, 
    required: true 
  },
  
  user: { 
    type: String, 
    required: true 
  },
  
});

const Result = mongoose.model('Result', resultSchema);

export default Result;