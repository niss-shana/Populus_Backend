import mongoose from 'mongoose';

const depSchema = new mongoose.Schema({
  departmentName: { 
    type: String, 
    required: true, 
    trim: true // Removes extra spaces
  },
  accessAreas: { 
    type: [String], // Array of strings for multiple localities
    required: true,
    validate: {
      validator: function (v) {
        // Ensure at least one access area is provided
        return v.length > 0;
      },
      message: "At least one access area is required!"
    }
  },
  email: { 
    type: String, 
    required: true,
    unique: true, // Ensures email is unique
    validate: {
      validator: function (v) {
        // Validate email format
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  district:{type:String},
  phone: { 
    type: String, 
    required: true,
    validate: {
      validator: function (v) {
        // Validate phone number format (10 digits)
        return /^\d{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  }
}, { timestamps: true }); // Adds createdAt and updatedAt fields automatically

const Department = mongoose.model('Department', depSchema);
export default Department;