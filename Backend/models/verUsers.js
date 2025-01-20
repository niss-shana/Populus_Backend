import mongoose from 'mongoose';

const residentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dateOfBirth: { type: String, required: true },
  gender: { type: String, required: true },
  houseDetails: { type: String, required: true }, 
  place: { type: String, required: true },
  locality: { type: String, required: true },
  district: { type: String, required: true },
  mobileNo: { type: String, required: true }, 
  aadhaarNo: { type: String, required: true }, 
  rationId: { type: String, required: true },
  photo: { type: String },
  mappedHouse: { type: String },
  username: {type: String, required: true},
  password: {type: String, required: true},
  presidentId: {  type: String},
  isOwnerHome: {type: String}, 
  
});


const VerifiedUsers = mongoose.model('VerifiedUsers', residentSchema);
export default VerifiedUsers;
