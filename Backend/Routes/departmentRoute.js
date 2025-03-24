import express  from 'express';
import RequestUsers from '../models/requser.js';
import VerifiedUsers from '../models/verUsers.js';
import LocalGovernment from '../models/locgov.js';
import Survey from '../models/Survey.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

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
      
      console.log(req.body);
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
  
      // Create a new resident with the hashed password
      const reqDepartment = new Department({
        ...req.body,
        password: hashedPassword, // Replace the plain password with the hashed one
      });
  
      await reqDepartment.save();
  
      console.log(reqDepartmentt);
      const demo = await Department.find();
      console.log(demo);
  
      res.status(201).json({ message: "SignUp details saved successfully" });
    } catch (error) {
      res.status(400).json({ error: error.message });
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
    // const passwordMatch = await bcrypt.compare(password, user.password);
    const passwordMatch = (password === user.password);//temporary
    console.log("Password is match:",passwordMatch);
    if (!passwordMatch) {
    return res.status(401).json({ error: 'Authentication failed' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY, {
    expiresIn: '1h',
    });
    console.log("token:",token);
    res.status(200).json({ success:true,Message:"Login Success",token });
    } catch (error) {
    res.status(500).json({ error: 'Login failed' });
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





router.post("/create_survey", authenticateToken, async (req, res) => {
  try {
    const { title, question, options } = req.body;
    console.log("department ethi")
   
    const creator = req.user.username;
    const access = await VerifiedUsers.find(
      { presidentId: username },
      { houseDetails: 1, mappedHouse: 1, wardNumber: 1, rationId:1, _id: 0 }
    );

    console.log(req.user.username)
    const profile="local_government" // Extract username from the token

    // Validate input
    if (!title || !question || !options || options.length < 2 || options.length > 4) {
      return res.status(400).json({ message: "Invalid survey data. Ensure title, question, and 2-4 options are provided." });
    }

    // Create a new survey document

    const newSurvey = new Survey({ 
      title, 
      question, 
      options, 
      creator,
      profile 
    });

    // Save the survey to the database
    await newSurvey.save();

    // Respond with success message and the created survey
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

