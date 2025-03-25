import express  from 'express';
import RequestUsers from '../models/requser.js';
import VerifiedUsers from '../models/verUsers.js';
import LocalGovernment from '../models/locgov.js';
import Survey from '../models/Survey.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import Department from '../models/department.js';
const router = express.Router();

import Announcement from '../models/announcement.js';
const saltRounds = 10;


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

// Apply auth middleware conditionally
router.use((req, res, next) => {
  // Array of routes/methods to exclude from auth
  const publicRoutes = [
    { path: '/login', methods: ['GET', 'POST'] },
    { path: '/signup', methods: ['GET', 'POST'] },
    { path: '/profile', methods: ['GET'] } // All GET /profile/* routes
  ];

  const isPublic = publicRoutes.some(route => 
    req.path.toLowerCase().startsWith(route.path.toLowerCase()) &&
    route.methods.includes(req.method)
  );

  if (isPublic) {
    return next();
  }
  
  // Apply authentication to all other routes
  authenticateToken(req, res, next);
});


router.post('/signup', async (req, res) => {
  try {
    console.log("Signup request body:", req.body);

    const { departmentName, accessAreas, email, phone, district } = req.body;

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

    // Generate username: departmentName + random 4 digits
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const username = `${departmentName.replace(/\s+/g, '_').toLowerCase()}_${randomDigits}`;

    // Generate random 8-character password
    const password = Math.random().toString(36).slice(-8);

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create a new department
    const newDepartment = new Department({
      departmentName,
      district,
      username,
      password: hashedPassword,
      accessAreas,
      phone,
      email,
    });

    // Save the department to the database
    await newDepartment.save();

    // Email configuration
    const mailOptions = {
      from: `"Organization Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Department Account Ready: ${departmentName}`,
      text: `Dear ${departmentName},\n\nYour department account has been successfully created.\n\n🔐 Username: ${username}\n🔐 Password: ${password}\n\n⚠️ Security Notice:\n1. Change your password immediately after first login\n2. Never share your credentials\n3. Contact ${process.env.SUPPORT_EMAIL || 'admin'} if you didn't request this\n\nBest regards,\n${process.env.ORG_NAME || 'POPULUS'} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Welcome, ${departmentName}!</h2>
          <p>Your department account is ready.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          
          <div style="background: #fff8e1; padding: 15px; border-left: 4px solid #ffc107;">
            <h4 style="margin-top: 0;">Security Instructions</h4>
            <ul>
              <li>Change password immediately after login</li>
              <li>Keep credentials confidential</li>
              <li>Report suspicious activity to <a href="mailto:${process.env.SUPPORT_EMAIL || process.env.EMAIL_USER}">support</a></li>
            </ul>
          </div>
          
          <p>Best regards,<br>${process.env.ORG_NAME || 'Your Organization'} Team</p>
        </div>`
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log("Credentials email sent to:", email);

    res.status(201).json({ 
      success: true,
      message: "Department registered successfully. Check your email for credentials.",
      data: {
        departmentName,
        username,
        email
      }
    });

  } catch (error) {
    console.error("Signup error:", error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        error: `${field} already exists!` 
      });
    }
    
    res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});






// GET /government/profile/:username
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(userId);
    

    // Find department by ID
    const department = await Department.findById(userId)
      .select('-password -tokens -__v'); // Exclude sensitive fields

    if (!department) {
      return res.status(404).json({ 
        success: false, 
        message: 'Department not found' 
      });
    }

    // Prepare response data
    const departmentProfile = {
      _id: department._id,
      departmentName: department.departmentName,
      username: department.username,
      email: department.email,
      phone: department.phone,
      district: department.district,
      accessAreas: department.accessAreas,
      createdAt: department.createdAt,
      
    };

    res.status(200).json({
      success: true,
      data: departmentProfile
    });

  } catch (error) {
    console.error('Department profile fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching department profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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






router.post("/create_survey", authenticateToken, async (req, res) => {
  try {
    const { title, question, options } = req.body;
    const creator = req.user.userId;
    console.log(creator)
    const profile = "local_government";

    // Validate input
    if (!title || !question || !options || options.length < 2 || options.length > 4) {
      return res.status(400).json({ 
        message: "Invalid survey data. Ensure title, question, and 2-4 options are provided." 
      });
    }

    // Get access areas directly as an array
    const department = await Department.findOne(
      { _id: creator },
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

router.post('/update-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Basic validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Both current and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters' 
      });
    }

    // Find department
    const department = await Department.findById(req.user.userId);
    if (!department) {
      return res.status(404).json({ 
        success: false,
        message: 'Department not found' 
      });
    }

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, department.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: 'Current password is incorrect' 
      });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    department.password = hashedPassword;
    await department.save();

    // Send email notification
    const mailOptions = {
      from: `"POPULUS Support" <${process.env.EMAIL_USER}>`,
      to: department.email,
      subject: 'Password Updated Successfully',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Password Updated</h2>
          <p>Your password for the ${department.departmentName} account has been successfully changed.</p>
          
          <div style="background: #fff8e1; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h4 style="margin-top: 0;">Security Notice</h4>
            <p>If you didn't make this change, please contact our support team immediately.</p>
          </div>
          
          <p>Best regards,<br>POPULUS Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      success: true,
      message: 'Password updated successfully. Notification email sent.' 
    });

  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});



router.post("/mysurvey", authenticateToken, async (req, res) => {
  try {
    console.log(" fectingdepartment survey");
    const userId = req.user.userId;
    const surveys = await Survey.find({ creator: userId });
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








router.post('/map', authenticateToken, async (req, res) => {
  try {
    const username = req.user.userId;
    console.log("Fetching map data for officer:", username);

    const access = await Department.findOne(
      { _id: username },
      { accessAreas: 1, _id: 0 }
    );

    if (!access || !access.accessAreas || access.accessAreas.length === 0) {
      console.log("No access areas found for officer:", username);
      return res.status(404).json({ success: false, error: "No access areas found" });
    }

    console.log(access);

    // Fetch only the required fields where presidentId matches any value in accessAreas
    const data = await VerifiedUsers.find(
      { presidentId: { $in: access.accessAreas } }, 
      { houseDetails: 1, mappedHouse: 1, wardNumber: 1, rationId: 1, _id: 0 }
    );

    console.log(data);

    if (!data || data.length === 0) {
      console.log("No data found for president:", username);
      return res.status(404).json({ success: false, error: "No data found" });
    }

    // Send data to the frontend with a success message
    res.status(200).json({ 
      success: true,
      message: "Data fetched successfully",
      data: data 
    });
  } catch (error) {
    console.error("Error in /map route:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});






router.post('/housedetails', authenticateToken, async (req, res) => {
  try {
    console.log("labeeee")
    console.log(req.body)
    console.log("hi")
    // Retrieve houseDetails from the request body
    const { rationId } = req.body;
    console.log("hi")

    // Ensure houseDetails is provided
    if (!rationId) {
      return res.status(400).json({ error: 'houseDetails is required' });
    }

    // Query the database for the house details
    const data = await VerifiedUsers.find({ rationId }).select('name dateOfBirth gender mobileNo aadhaarNo occupation photo income  ');
    console.log(data)
    

    // If no data is found, respond accordingly
    if (data.length === 0) {
      return res.status(404).json({ error: 'No house details found' });
    }

    // Send the data as a response
    res.status(200).json({ data });
  } catch (error) {
    // Handle errors
    console.error('Error fetching house details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});












export default router
