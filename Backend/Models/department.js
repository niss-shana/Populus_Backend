import mongoose from 'mongoose';

const depSchema = new mongoose.Schema({
  departmentName: { type: String, required: true },
  accessAreas: [{ type: String }],
  email: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  district: { type: String},
  phone: { type: String, required: true }
}, { timestamps: true }); // Adds createdAt and updatedAt fields automatically

const Department = mongoose.model('Department', depSchema);
export default Department;