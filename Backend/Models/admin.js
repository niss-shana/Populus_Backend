import mongoose from 'mongoose';

const depSchema = new mongoose.Schema({
 
 
  username: { type: String, required: true },
  password: { type: String, required: true },
  
  
}); // Adds createdAt and updatedAt fields automatically

const admin = mongoose.model('admin', depSchema);
export default admin;