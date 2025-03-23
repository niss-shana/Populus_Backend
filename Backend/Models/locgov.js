import mongoose from 'mongoose';

const govSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  dob: { type: String, required: true },
  gender: { type: String, required: true },
  house: { type: String, required: true },
  place: { type: String, required: true },
  locality: { type: String, required: true },
  selfGovType: { type: String, required: true },
  district: { type: String, required: true },
  mobile: { type: String, required: true },
  aadhaar: { type: String, required: true },
  email: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  photo: { type: String },
}, { timestamps: true });

const LocalGovernment = mongoose.models.LocalGovernment || mongoose.model('LocalGovernment', govSchema);
export default LocalGovernment;
