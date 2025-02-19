import express from 'express';
import RequestUsers from '../models/requser.js';
import VerifiedUsers from '../models/verUsers.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Survey from '../Models/Survey.js';
import Result from '../Models/Result.js';


 
const router = express.Router();
const saltRounds = 10;

// Authentication middleware
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
  if (req.path === '/resident_signup' || req.path === '/resident_login') {
    return next(); // Skip authentication for these routes
  }
  authenticateToken(req, res, next); // Apply authentication to all other routes
});

// Configure multer for profile photo upload
const storage = multer.diskStorage({
  destination: './uploads/profiles',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
  }
}).single('photo');

// Signup route
router.post('/resident_signup', async (req, res) => {
  try {
    console.log("resident add");
    console.log(req.body);

    // Check if username already exists
    const existingUser = await RequestUsers.findOne({ username: req.body.username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    // Create a new resident with the hashed password
    const reqResident = new RequestUsers({
      ...req.body,
      password: hashedPassword,
    });

    await reqResident.save();
    res.status(201).json({ message: "Resident saved successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login route
router.post('/resident_login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await VerifiedUsers.findOne({ username });
    console.log(user)
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Incorrect Password' });
    }

     const token = jwt.sign(
          { userId: user._id, username: user.username }, // Payload
          process.env.JWT_KEY, // Secret key
          { expiresIn: '365d' } // Expires in 365 days
        );

    res.status(200).json({ 
      success: true,
      message: "Login Success",
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Username availability check
router.get('/check-username/:username', async (req, res) => {
  console.log("username check")
  const { username } = req.params;
  console.log(username);
  try {
    const existingUser = await VerifiedUsers.findOne({ username });
    console.log(existingUser);
    res.json({ available: !existingUser });
  } catch (error) {
    console.error('Error checking username availability:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await RequestUsers.findById(req.userId)
      .select('-password -refreshToken');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const updateData = req.body;

    // Fields that shouldn't be updated through this endpoint
    delete updateData.password;
    delete updateData.aadhaarNo;
    delete updateData.rationId;
    delete updateData.username;
    delete updateData.photo;

    const updatedUser = await RequestUsers.findByIdAndUpdate(
      req.userId,
      { $set: updateData },
      {
        new: true,
        runValidators: true
      }
    ).select('-password -refreshToken');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload profile photo
router.post('/profile/photo', authenticateToken, (req, res) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: 'File upload error' });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const user = await RequestUsers.findById(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Delete old photo if exists
      if (user.photo) {
        const oldPhotoPath = path.join(process.cwd(), user.photo);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }

      const photoUrl = `/uploads/profiles/${file.filename}`;
      
      const updatedUser = await RequestUsers.findByIdAndUpdate(
        req.userId,
        { $set: { photo: photoUrl } },
        { new: true }
      ).select('-password -refreshToken');

      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating profile photo:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
});
router.post('/map', authenticateToken, async (req, res) => {
  try {
    console.log("ethi")
    const data = await VerifiedUsers.find(); // Fetch data from the database
    console.log(data);

    if (!data) {
      console.log("error");
      return res.status(401).json({ success: false, error: "No data found" }); // Send error message if data is not found
    }
    
    // Send data to the frontend with a success message
    res.status(200).json({ 
      success: true,
      message: "Data fetched successfully",
      data: data 
    });
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ success: false, error: "Internal Server Error" }); // Send error response
  }
});






router.post('/poling', authenticateToken, async (req, res) => {
  try {
    console.log("Fetching presidentId for user");

    // Extract the username from the authenticated user
    const userId = req.user.username;
    console.log("User ID:", userId);

    // Find the user in the VerifiedUsers collection
    const user = await VerifiedUsers.findOne({ username: userId });

    if (!user) {
      console.log("User not found");
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Extract the presidentId from the user document
    const presidentId = user.presidentId;
    console.log("PresidentId:", presidentId);

    // Fetch surveys created by the presidentId and are active
    const surveys = await Survey.find({ creator: presidentId, active: true });
    console.log(surveys)

    if (!surveys || surveys.length === 0) {
      console.log("No surveys found for the president");
      return res.status(200).json({ 
        success: true,
        message: "No surveys found",
        surveys: [] // Return an empty array if no surveys are found
      });
    }

    // Send the surveys to the frontend with a success message
    res.status(200).json({ 
      success: true,
      message: "Data fetched successfully",
      surveys
    });
  } catch (error) {
    console.error("Error:", error); // Log the error for debugging
    res.status(500).json({ success: false, error: "Internal Server Error" }); // Send error response
  }
});







router.post('/submit-survey', authenticateToken, async (req, res) => {
  try {
    const username = req.user.username;
    const { surveyId, selectedOption } = req.body;
    console.log(req.body)
    console.log(username)
    const surveyResult = new Result({
      surveyid:surveyId,
      option:selectedOption,
      user:username

    
    });
    await surveyResult.save();

    

    res.status(200).json({ success: true, message: 'Response submitted successfully' });
  } catch (error) {
    console.error('Error submitting survey:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});





export default router;