import mongoose from 'mongoose';

const residentSchema = new mongoose.Schema({
  name: { type: String },
  dateOfBirth: { type: String },
  gender: { type: String },
  houseDetails: { type: String }, 
  place: { type: String },
  locality: { type: String },
  district: { type: String},
  mobileNo: { type: String }, 
  aadhaarNo: { type: String}, 
  rationId: { type: String},
  photo: { type: String },
  mappedHouse: { type: String },
  username: {type: String},
  password: {type: String},

});


const RequestUsers = mongoose.model('RequestUsers', residentSchema);
export default RequestUsers;
