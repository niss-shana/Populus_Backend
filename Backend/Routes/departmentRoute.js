import express  from 'express';
import RequestUsers from '../models/requser.js';
import VerifiedUsers from '../models/verUsers.js';
import LocalGovernment from '../models/locgov.js';
import Survey from '../models/Survey.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import Department from '../models/department.js';
const saltRounds = 10;

const router = express.Router();



const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  jwt.verify(token, process.env.JWT_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token." });
    }
    console.log("Decoded user payload:", user); // Debugging
    req.user = user; // Attach the user payload to the request object
    next();
  });
};

// Apply the middleware globally to all routes except `/login` and `/signup`
router.use((req, res, next) => {
  if (req.path === '/login' || req.path === '/signup' ) {
    return next(); // Skip authentication for these routes
  }
  authenticateToken(req, res, next); // Apply authentication to all other routes
});


router.post('/signup', async (req, res) => {
  try {
    const { departmentName, username, accessAreas, email, phone } = req.body;

    // Check if username already exists
    const existingUser = await Department.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Hash the password (using phone as password in your example)
    const hashedPassword = await bcrypt.hash(phone, saltRounds);

    // Create new department
    const newDepartment = new Department({
      departmentName,
      username,
      accessAreas,
      email,
      phone,
      password: hashedPassword,
    });

    await newDepartment.save();

    res.status(201).json({ message: "Department created successfully" });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: error.message });
  }
});







// GET /government/profile/:username
router.get('/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Find user by username
    const user = await Department.findOne({ username });
    console.log(user)

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Remove sensitive information
    const userProfile = {
      _id: user._id,
      name: user.fullName,
      username: user.username,
      email: user.email,
      mobileNo: user.mobile,
      district: user.district,
      department: user.department,
      locality: user.localBody,
      photo: user.photo
    };

    res.json(userProfile);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching profile data' 
    });
  }
});


router.post('/login', async (req, res) => {
  try {
    console.log(req.body);
    const { username, password } = req.body;
    console.log(username);
    const user = await Department.findOne({username: username });
    console.log(user);
    if (!user) {
      console.log("error");
    return res.status(401).json({ error: 'Authentication failed' });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("Password is match:",passwordMatch);
    if (!passwordMatch) {
    return res.status(401).json({ error: 'Authentication failed' });
    }
     const token = jwt.sign(
          { userId: user._id, username: user.username }, // Payload
          process.env.JWT_KEY, // Secret key
          { expiresIn: '365d' } // Expires in 365 days
        );
    console.log("token:",token);
    res.status(200).json({ success:true,Message:"Login Success",token });
    } catch (error) {
    res.status(500).json({ error: 'Login failed' });
    }
});






router.post("/create_survey", authenticateToken, async (req, res) => {
  try {
    const { title, question, options } = req.body;
    const creator = req.user.username;
    const profile = "local_government";

    // Validate input
    if (!title || !question || !options || options.length < 2 || options.length > 4) {
      return res.status(400).json({ 
        message: "Invalid survey data. Ensure title, question, and 2-4 options are provided." 
      });
    }

    // Get access areas directly as an array
    const department = await Department.findOne(
      { username: creator },
      { accessAreas: 1, _id: 0 }
    );

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Create a new survey with simplified access structure
    const newSurvey = new Survey({ 
      title, 
      question, 
      options, 
      creator,
      profile,
      access: department.accessAreas // Directly use the array of access areas
    });

    await newSurvey.save();

    res.status(201).json({ 
      message: "Survey created successfully", 
      survey: newSurvey 
    });
  } catch (error) {
    console.error("Error saving survey:", error);
    res.status(500).json({ 
      message: "Internal server error", 
      error: error.message 
    });
  }
});








export default router

