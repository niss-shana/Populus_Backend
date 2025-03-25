import mongoose from 'mongoose';

const govSchema = new mongoose.Schema({
 phone:{type:String},
 district:{type:String},
  locality: { type: String, required: true },
  selfGovType:{ type: String, required: true},
  email: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true }); // Adds createdAt and updatedAt fields automatically

const LocalGovernment = mongoose.model('LocalGovernment', govSchema);
export default LocalGovernment;
