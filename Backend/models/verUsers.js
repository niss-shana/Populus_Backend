import mongoose from 'mongoose';

const residentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dateOfBirth: { type: String, required: true },
  email: {type: String},
  gender: { type: String, required: true },
  houseDetails: { type: String, required: true },
  place: { type: String },
  locality: { type: String },
  district: { type: String, required: true },
  mobileNo: { type: String, required: true },
  aadhaarNo: { type: String, required: true },
  rationId: { type: String, required: true },
  selfGovType: { type: String},
  photo: { type: String },
  income: { type: String},
  mobileNo: { type: String }, 
  aadhaarNo: { type: String}, 
  rationId: { type: String},
  photo: { type: String },
  mappedHouse: { type: String },
  username: {type: String, required: true},
  password: {type: String, required: true},
  presidentId: {  type: String},
  isOwnerHome: {type: String}, 
  occupation:{type:String}, 
  rationcardType:{type:String}, 
});

// Check if the model already exists
const VerifiedUsers = mongoose.models.VerifiedUsers || mongoose.model('VerifiedUsers', residentSchema);

export default VerifiedUsers;