import mongoose from 'mongoose';

const residentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  ward: { type: String, required: true },
  verified: { type: Boolean, default: false },
});

const Resident = mongoose.model('Resident', residentSchema);
export default Resident;

