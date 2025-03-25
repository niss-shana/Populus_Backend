import express from 'express';
import RequestUsers from '../models/requser.js';
import VerifiedUsers from '../models/verUsers.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import Survey from '../models/Survey.js';
import Result from '../models/Result.js';
import nodemailer from 'nodemailer';

 
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

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your preferred service
  auth: {
    user: 'populus.initiative@gmail.com',
    pass: 'vinw nsoq fykj hovv',
  },
});



// Store OTPs temporarily (in a real app, use Redis or a database)
const otpStore = new Map(); // { email/phone: { otp, expiry, attempts } }

// Apply the middleware globally to all routes except authentication routes
router.use((req, res, next) => {
  if (
    req.path === '/resident_signup' || 
    req.path === '/resident_login' ||
    req.path === '/forgot-password' ||
    req.path === '/verify-otp' ||
    req.path === '/resend-otp' ||
    req.path === '/reset-password'||
    req.path.match(/^\/check-username\/[^\/]+$/)  
  ) {
    return next(); // Skip authentication for these routes
  }
  authenticateToken(req, res, next); // Apply authentication to all other routes
});



// Signup route
router.post('/resident_signup', async (req, res) => {
  try {
    console.log("group resident add");
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
          { userId: user._id, username: user.username ,access:user.presidentId}, // Payload
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

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via email
const sendEmailOTP = async (email, otp) => {
  try {
    console.log("Preparing email...");
    const mailOptions = {
      from:{
        name:"Populus",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: 'Password Reset Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
          <h2 style="color: #333; text-align: center;">Password Reset</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            We received a request to reset your password. Use the verification code below to complete the process:
          </p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px;">${otp}</span>
          </div>
          <p style="font-size: 14px; color: #777;">
            This code will expire in 5 minutes. If you didn't request a password reset, please ignore this email.
          </p>
        </div>
      `,
    };

    console.log("Sending email...");
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error; // Re-throw the error to be caught in the route handler
  }
};

router.post('/forgot-password', async (req, res) => {
  try {
    console.log("forgot password");
    const { email } = req.body;
    console.log(email);
    // Validate request
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    console.log("Checking if user exists...");
    const user = await VerifiedUsers.findOne({ email });
    if (!user) {
      console.log("User not found, but returning generic message for security");
      // For security reasons, don't reveal if the user exists or not
      return res.status(200).json({ message: 'If a user with this email exists, a verification code has been sent.' });
    }
    console.log("user",user)
    // Generate OTP
    console.log("Generating OTP...");
    const otp = generateOTP();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 5); // OTP valid for 5 minutes

    // Store OTP
    console.log("Storing OTP...");
    otpStore.set(email, {
      otp,
      expiry,
      attempts: 0,
      userId: user._id
    });

    // Send OTP
    console.log("Sending OTP via email...");
    console.log("Email User:", process.env.EMAIL_USER); // Debugging
    console.log("Email Password:", process.env.EMAIL_APP_PASSWORD ? "***" : "Not set"); // Debugging
    await sendEmailOTP(email, otp);

    console.log("OTP sent successfully");
    res.status(200).json({ message: 'Verification code sent to your email' });
  } catch (error) {
    console.error("Error in /forgot-password:", error);
    res.status(500).json({ message: 'Failed to process request', error: error.message });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate request
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    const user = await VerifiedUsers.findOne({ email });
    if (!user) {
      // For security reasons, don't reveal if the user exists or not
      return res.status(200).json({ message: 'If a user with this email exists, a verification code has been sent.' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 5); // OTP valid for 5 minutes

    // Store OTP
    otpStore.set(email, {
      otp,
      expiry,
      attempts: 0,
      userId: user._id
    });

    // Send OTP
    await sendEmailOTP(email, otp);

    res.status(200).json({ message: 'New verification code sent to your email' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to process request', error: error.message });
  }
});

// Verify OTP route
router.post('/verify-otp', async (req, res) => {
  try {
    
    const { email, otp } = req.body;
    console.log("verify otp",otp);
    // Validate request
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required' });
    }

    // Check if OTP exists
    const otpData = otpStore.get(email);
    console.log(otpData);
    if (!otpData) {
      return res.status(400).json({ message: 'No verification code found or it has expired. Please request a new one.' });
    }

    // Check if OTP is expired
    if (new Date() > otpData.expiry) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    // Check if max attempts reached (3 attempts)
    if (otpData.attempts >= 3) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new verification code.' });
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      otpData.attempts += 1;
      otpStore.set(email, otpData);
      return res.status(400).json({ 
        message: 'Invalid verification code', 
        attemptsLeft: 3 - otpData.attempts 
      });
    }

    // Generate a temporary token for password reset (valid for 15 minutes)
    const resetToken = jwt.sign(
      { userId: otpData.userId },
      process.env.JWT_RESET_KEY,
      { expiresIn: '15m' }
    );

    // Remove OTP from store after successful verification
    otpStore.delete(email);

    res.status(200).json({ 
      message: 'Verification successful', 
      resetToken 
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify code', error: error.message });
  }
});

// Reset password route
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    console.log(resetToken);
    if (!resetToken || !newPassword) {
      return res.status(400).json({ message: 'Reset token and new password are required' });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_RESET_KEY);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired reset token. Please try again.' });
    }

    // Get user from database
    const user = await VerifiedUsers.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check password complexity
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user's password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password reset successful. You can now login with your new password.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reset password', error: error.message });
  }
});




// Change password route (for logged in users)
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    // Get user from database
    const user = await VerifiedUsers.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Check password complexity
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update user's password
    user.password = hashedPassword;
    await user.save();
    
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to change password', error: error.message });
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
  console.log("profile");
  try {
    console.log("User ID:", req.user.userId);
    const user = await VerifiedUsers.findById(req.user.userId)
      .select('-password -refreshToken');
      console.log("User:", user); // Debugging: Check query result
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
    

    const updatedUser = await VerifiedUsers.findByIdAndUpdate(
      req.user.userId,
      { $set: updateData },
      {
        new: true,
        runValidators: true
      }
    ).select('-password -refreshToken');

    console.log(updatedUser);

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});




router.post('/map', authenticateToken, async (req, res) => {
  try {
    console.log("Received request for map data");
    const userId = req.user.userId;
    console.log("User ID:", userId);

    // Find the user document first
    const userdata = await VerifiedUsers.findById(userId);
    if (!userdata) {
      console.log("User not found");
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Find all users with the same presidentId
    const data = await VerifiedUsers.find(
      { presidentId: userdata.presidentId },
      { houseDetails: 1, mappedHouse: 1, wardNumber: 1, rationId: 1, _id: 0 }
    );

    console.log("Fetched data:", data);

    if (!data || data.length === 0) {
      console.log("No data found for presidentId:", userdata.presidentId);
      return res.status(404).json({ success: false, error: "No data found" });
    }
    
    res.status(200).json({ 
      success: true,
      message: "Data fetched successfully",
      data: data 
    });
  } catch (error) {
    console.error("Error in /map route:", error);
    res.status(500).json({ 
      success: false, 
      error: "Internal Server Error",
      message: error.message 
    });
  }
});
router.post('/poling', authenticateToken, async (req, res) => {
  try {
    console.log("Fetching available surveys for user");

    const username = req.user.username;
    console.log("Username:", username);

    // Find the user
    const user = await VerifiedUsers.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const presidentId = user.presidentId;
    console.log("PresidentId:", presidentId);

    // 1. Find all surveys the president has access to
    const allSurveys = await Survey.find({
      active: true,
      $or: [
        { creator: presidentId },
        { access: presidentId }
      ]
    });

    // 2. Find all surveys this user has already voted in
    const userResults = await Result.find({ user: username });
    console.log("User voting history:", userResults);
    
    // Convert survey _ids to strings for comparison with Result.surveyid
    const allSurveyIds = allSurveys.map(s => s._id.toString());
    
    // Get voted surveyids and filter to only include those that exist in current surveys
    const votedSurveyIds = userResults
      .map(result => result.surveyid)
      .filter(surveyid => allSurveyIds.includes(surveyid));

    console.log("Relevant voted survey IDs:", votedSurveyIds);

    // 3. Filter out surveys the user has already voted in
    const availableSurveys = allSurveys.filter(survey => 
      !votedSurveyIds.includes(survey._id.toString())
    );

    console.log("Available surveys count:", availableSurveys.length);
    console.log("First available survey:", availableSurveys[0]?._id);

    res.status(200).json({
      success: true,
      message: availableSurveys.length > 0
        ? "Available surveys fetched successfully"
        : "No available surveys found",
      surveys: availableSurveys
    });

  } catch (error) {
    console.error("Error in /poling route:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message
    });
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