import mongoose from 'mongoose';

const residentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dateOfBirth: { type: String, required: true },
  gender: { type: String, required: true },
  houseNumber: { type: String, required: true },
  place: { type: String, required: true },
  locality: { type: String, required: true },
  district: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  aadhaarNumber: { type: String, required: true },
  rationId: { type: String, required: true },
  photo: { type: String },
  mappedHouse: { type: String },
  ward: { type: String, required: true },
  verified: { type: Boolean, default: false },
});

const Resident = mongoose.model('Resident', residentSchema);
export default Resident;
