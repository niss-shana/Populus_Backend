import mongoose from 'mongoose';

const govSchema = new mongoose.Schema({
  fullName: { type: String, required: true }, // Corrected from 'name' to 'fullName'
  dob: { type: String, required: true }, // Corrected from 'dateOfBirth' to 'dob'
  gender: { type: String, required: true },
  house: { type: String, required: true }, // Corrected from 'houseDetails' to 'house'
  place: { type: String, required: true },
  locality: { type: String, required: true },
  selfGovType:{ type: String, required: true},
  district: { type: String, required: true },
  mobile: { type: String, required: true }, // No validation added
  aadhaar: { type: String, required: true }, // No validation added
  email: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  photo: { type: String }, // File path or URL for the photo
}, { timestamps: true }); // Adds createdAt and updatedAt fields automatically

const LocalGovernment = mongoose.model('LocalGovernment', govSchema);
export default LocalGovernment;
