import mongoose from 'mongoose';

const residentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dateOfBirth: { type: String, required: true }, // Added for Date of Birth
  gender: { type: String, required: true }, // Added for Gender
  keraliteStatus: { type: String, required: true }, // Added for Keralite/Non-Keralite
  houseNumber: { type: String, required: true }, // Added for House No/Name
  place: { type: String, required: true }, // Added for Place
  locality: { type: String, required: true }, // Added for Locality
  district: { type: String, required: true }, // Added for District
  mobileNumber: { type: String, required: true }, // Added for Mobile No
  aadhaarNumber: { type: String, required: true }, // Added for Aadhaar No
  rationId: { type: String, required: true }, // Added for Ration ID
  photo: { type: String }, // Added for Uploaded Photo (URL or filename)
  mappedHouse: { type: String }, // Added for Mapped House (latitude and longitude)
  ward: { type: String, required: true },
  verified: { type: Boolean, default: false },
});

const Resident = mongoose.model('Resident', residentSchema);
export default Resident;

