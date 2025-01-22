import mongoose from 'mongoose';

const residentSchema = new mongoose.Schema({
  name: { type: String },
  dateOfBirth: { type: String },
  gender: { type: String },
  houseDetails: { type: String }, 
  selfGovType: { type: string},
  localBody: {type: string},
  district: { type: String},
  mobileNo: { type: String }, 
  aadhaarNo: { type: String}, 
  rationId: { type: String},
  photo: { type: String },
  mappedHouse: { type: String },
  username: {type: String},
  password: {type: String},
  email: {type: String},
  isOwnerHome: {type:String},
});


const RequestUsers = mongoose.model('RequestUsers', residentSchema);
export default RequestUsers;
