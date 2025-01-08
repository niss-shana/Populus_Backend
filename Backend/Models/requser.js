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
  verified: { type: Boolean, default: false },
});


const RequestUsers = mongoose.model('RequestUsers', residentSchema);
export default RequestUsers;
