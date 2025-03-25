import express  from 'express';
import RequestUsers from '../models/requser.js';
import VerifiedUsers from '../models/verUsers.js';
import LocalGovernment from '../models/locgov.js';
import Department from '../models/department.js';
const router = express.Router();import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import Announcement from '../models/announcement.js';

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your preferred service
  auth: {
    user: 'populus.initiative@gmail.com',
    pass: 'vinw nsoq fykj hovv',
  },
});

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



router.post('/signup', async (req, res) => {
  try {
    console.log("Signup request body:", req.body);

    const { departmentName, accessAreas, email, phone,district } = req.body;

    // Validate required fields
    if (!departmentName || !accessAreas || !email || !phone) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Validate phone number format (10 digits)
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: "Invalid phone number format (must be 10 digits)" });
    }

    // Validate accessAreas array
    if (!Array.isArray(accessAreas) || accessAreas.length === 0) {
      return res.status(400).json({ error: "At least one access area is required" });
    }

    // Set username as department name and password as phone number
    const username = departmentName;
    const password = phone;

    // Hash the password (phone number)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create a new department
    const reqDepartment = new Department({
      departmentName,
      district,
      username,
      password: hashedPassword,
      accessAreas, // Ensure accessAreas is passed correctly
      phone,
      email,
    });

    // Log the department object before saving
    console.log("Department object before saving:", reqDepartment);

    // Save the department to the database
    await reqDepartment.save();

    console.log("Department saved:", reqDepartment);

    // Send email notification
    const mailOptions = {
      from: process.env.EMAIL_USER, // Sender email address
      to: email, // Recipient email address
      subject: 'Your Department Account Has Been Created', // Email subject
      text: `Dear ${departmentName},\n\nYour department account has been successfully created.\n\nUsername: ${username}\nPassword: ${password}\n\nPlease keep this information secure.\n\nBest regards,\nYour Organization`, // Email body
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });

    res.status(201).json({ message: "SignUp details saved successfully. Check your email for credentials." });
  } catch (error) {
    console.log("Error during signup:", error);
    if (error.code === 11000) {
      // Handle duplicate key error (e.g., duplicate email or username)
      return res.status(400).json({ error: "Email or username already exists!" });
    }
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
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("Password is match:",passwordMatch);
    if (!passwordMatch) {
    return res.status(401).json({ error: 'Authentication failed' });
    }
    const token = jwt.sign({ userId: user._id ,role:user.username,access:user.accessAreas}, process.env.JWT_KEY, {
    expiresIn: '365d',
    });
    console.log("token:",token);
    res.status(200).json({ success:true,Message:"Login Success",token });
    } catch (error) {
    res.status(500).json({ error: 'Login failed' });
    }
});

router.post('/post_create', authenticateToken, async (req, res) => {
  try {
    console.log("create");
    console.log("Received data:", req.body);
    console.log("Received file:", req.file);
    const { department, title, message,time,imageUri,access } = req.body;
    

    // Validate required fields
    if (!department || !title || !message ) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate time format
    let parsedTime = Date.now();
    if (time) {
      if (isNaN(Date.parse(time))) {
        return res.status(400).json({ error: 'Invalid time format' });
      }
      parsedTime = new Date(time);
    }
    // Create a new announcement
    const newAnnouncement = new Announcement({
      department,
      title,
      message,
      imageUri,
      reactions: {
        likes: 0,
        dislikes: 0,
        comments: []
      },
      time: parsedTime,
      access,
      createdAt: new Date()
    });
    // Save the new announcement to the database
    await newAnnouncement.save();
    console.log("Saving announcement:", newAnnouncement);

    return res.status(201).json({
      message: 'Announcement created successfully!',
      announcement: newAnnouncement,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server Error' });
  }
});

router.get('/profile/:userId', async (req, res) => {
  console.log("profile");
  try {
    const department = await Department.findById(req.params.userId)
      .select('-password -__v -tokens'); // Exclude sensitive fields

    if (!department) {
      return res.status(404).json({ 
        success: false,
        error: 'Department not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: department._id,
        departmentName: department.departmentName,
        accessAreas: department.accessAreas,
        email: department.email,
        username: department.username,
        district: department.district,
        phone: department.phone,
        createdAt: department.createdAt
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch department profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});














export default router
