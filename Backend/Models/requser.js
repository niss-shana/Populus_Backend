import mongoose from 'mongoose';

const residentSchema = new mongoose.Schema({
  name: { type: String },
  dateOfBirth: { type: String },
  gender: { type: String },
  email: { type: String },
  houseDetails: { type: String }, 
  wardNumber: { type: String }, 
  selfGovType: { type: String},
  localBody: {type: String},
  district: { type: String},
  income: { type: String},
  mobileNo: { type: String }, 
  aadhaarNo: { type: String}, 
  rationId: { type: String},
  photo: { type: String },
  mappedHouse: { type: String },
  username: {type: String},
  password: {type: String},
  email: {type: String},
  isOwnerHome: {type:String},
  occupation:{type:String},  
  
});


const RequestUsers = mongoose.model('RequestUsers', residentSchema);
export default RequestUsers;
