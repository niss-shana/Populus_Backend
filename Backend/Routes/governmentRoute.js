import express  from 'express';
import RequestUsers from '../models/requser.js';
import VerifiedUsers from '../models/verUsers.js';
import LocalGovernment from '../models/locgov.js';
import Survey from '../models/Survey.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import admin from '../Models/admin.js';
import Feedback from '../models/feedback.js';

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

router.get('/verifiedusers', async (req, res) => {
  try {
    // Log all incoming request details
    console.log('Incoming Verified Users Request:', {
      method: req.method,
      headers: JSON.stringify(req.headers),
      body: JSON.stringify(req.body),
      query: JSON.stringify(req.query)
    });

    // Try to get the current username from request body or headers
    const currentUsername = req.body.currentUsername || req.headers['x-username'];

    // Detailed username logging
    console.log('Extracted Username:', {
      currentUsername,
      bodyUsername: req.body.currentUsername,
      headerUsername: req.headers['x-username']
    });

    // If no username is provided, return an error
    if (!currentUsername) {
      console.error('Missing Username Error', {
        body: req.body,
        headers: req.headers
      });
      return res.status(400).json({ 
        message: 'Current username is required',
        details: {
          bodyKeys: Object.keys(req.body),
          headerKeys: Object.keys(req.headers)
        }
      });
    }

    // Log database query details
    console.log('Searching for users with locality:', currentUsername);

    // Find users whose locality matches the current username
    const usersQuery = { locality: currentUsername };
    
    // Additional logging for query
    console.log('Full Query Object:', usersQuery);

    // Perform the database query with additional logging
    const users = await VerifiedUsers.find(usersQuery)
      .lean() // Convert to plain JavaScript objects for easier logging
      .catch(queryError => {
        console.error('Database Query Error:', {
          error: queryError.message,
          stack: queryError.stack,
          query: usersQuery
        });
        throw queryError; // Re-throw to be caught by outer catch block
      });

    // Detailed users logging
    console.log('Query Results:', {
      usersCount: users.length,
      userIds: users.map(user => user._id),
      userLocalities: users.map(user => user.locality)
    });

    // Check if any users were found
    if (!users || users.length === 0) {
      console.warn('No Users Found', {
        searchCriteria: usersQuery,
        message: 'No users found for the given locality'
      });

      // Optional: Log all existing localities for debugging
      const allLocalities = await VerifiedUsers.distinct('locality');
      console.log('All Available Localities:', allLocalities);

      return res.status(404).json({ 
        message: 'No users found',
        searchCriteria: usersQuery,
        availableLocalities: allLocalities
      });
    }

    // Return the found users
    res.json(users);

  } catch (error) {
    // Comprehensive error logging
    console.error('Verified Users Fetch Error:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      requestDetails: {
        method: req.method,
        url: req.url,
        headers: JSON.stringify(req.headers),
        body: JSON.stringify(req.body)
      }
    });

    // Differentiated error responses
    if (error.name === 'ValidationError') {
      res.status(400).json({ 
        error: 'Validation Error', 
        details: error.errors 
      });
    } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
      res.status(500).json({ 
        error: 'Database Error', 
        message: error.message 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to fetch users', 
        message: error.message 
      });
    }
  }
});

// Replace the global middleware with:
router.use((req, res, next) => {
  const publicRoutes = ['/login', '/signup', '/verify-user','/users','/admin_login'];
  if (publicRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }
  authenticateToken(req, res, next);
});

router.get('/users', async (req, res) => {
  try {
    // Try to get the current username from request body or headers
    const currentUsername = req.body.currentUsername || req.headers['x-username'];

    // If no username is provided, return all users (or you can choose to return an error)
    if (!currentUsername) {
      return res.status(400).json({ message: 'Current username is required' });
    }

    // Find users whose locality matches the current username
    const users = await RequestUsers.find({ 
      locality: currentUsername 
    });

    // Check if any users were found
    if (!users || users.length === 0) {
      console.log("no users found")
    }

    // Return the found users
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your preferred service
  auth: {
    user: 'populus.initiative@gmail.com',
    pass: 'vinw nsoq fykj hovv',
  },
});

 


router.post('/adding_residents', authenticateToken, async (req, res) => {
  try {
    const { _id, email, aadhaarNo, rationId, mobileNo, ...userDetails } = req.body;
    console.log(req.body);
    // Check if user already exists by any unique identifier
    const existingUser = await VerifiedUsers.findOne({
      $or: [
        { email: email },
        { aadhaarNo: aadhaarNo },
        { rationId: rationId },
        { mobileNo: mobileNo }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'User already exists',
        existingUser: {
          _id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email
        }
      });
    }

    // Add presidentId if not provided
    userDetails.presidentId = req.user.username || 'unknown';
    console.log(req.user.username);
    // Create new verified user
    const verifiedUser = new VerifiedUsers({
      email,
      aadhaarNo,
      rationId,
      mobileNo,
      houseDetails: userDetails.houseDetails || 'Not specified', // Add a default value
      ...userDetails
    });

    await verifiedUser.save();

    // Send email with credentials
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Account Has Been Verified',
      text: `Dear ${userDetails.name},\n\nYour account has been verified. Here are your login credentials:\n\nUsername: ${userDetails.username}\nPassword: ${userDetails.password}\n\nPlease keep this information secure.\n\nBest regards,\nYour Organization`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ 
      message: 'User verified successfully and email sent.',
      userId: verifiedUser._id 
    });

  } catch (error) {
    console.error('Error in adding resident:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});





router.post('/verify-user', async (req, res) => {
  try {
    const { _id, ...userDetails } = req.body;
    userDetails.presidentId = req.body.presidentId || 'unknown';
    
     // Check if user already exists in verified users
     const existingUser = await VerifiedUsers.findOne({ email });
     if (existingUser) {
       return res.status(400).json({
         success: false,
         error: 'User already verified',
         message: 'This user has already been verified and exists in the system'
       });
     }
 

    // Save verified user
    const verifiedUser = new VerifiedUsers(userDetails);
    const savedUser = await verifiedUser.save();

    // Remove from unverified
    await RequestUsers.findByIdAndDelete(_id);

    // Send email
    await transporter.sendMail({
      from: `"POPULUS Team" <${process.env.EMAIL_USER}>`,
      to: savedUser.email,
      subject: 'Account Verified - You Can Now Log In',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    max-width: 600px; 
                    margin: 0 auto; 
                    padding: 20px;
                }
                .header { 
                    background-color: #2c3e50; 
                    padding: 20px; 
                    text-align: center; 
                    color: white;
                }
                .button { 
                    display: inline-block; 
                    padding: 12px 24px; 
                    background-color: #3498db; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 4px; 
                    margin: 15px 0;
                }
                .footer { 
                    margin-top: 20px; 
                    font-size: 12px; 
                    color: #777; 
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Account Verified</h1>
            </div>
            
            <p>Dear ${savedUser.name || 'User'},</p>
            
            <p>Your account has been successfully verified by our team.</p>
            
            <p>You may now:</p>
            <ul>
                <li>Log in using your credentials</li>
                <li>Access all platform features</li>
                <li>Update your profile information</li>
            </ul>
            
            <p>If you have any questions, reply to this email or contact support.</p>
            
            <div class="footer">
                <p>© ${new Date().getFullYear()} Your Platform Name</p>
            </div>
        </body>
        </html>
      `,
    });

    res.status(200).json({ 
      success: true,
      message: 'User verified and notification sent',
      data: savedUser
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Verification failed',
      details: error.message
    });
  }
});




router.delete('/delete-user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    await RequestUsers.findByIdAndDelete(userId); // Delete from unverified users collection
    res.status(200).json({ message: 'User deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});





router.post('/login', async (req, res) => {
  try {
    console.log(req.body);
    const { username, password } = req.body;
    console.log(username);
    const user = await LocalGovernment.findOne({username: username });
    console.log(user);
    if (!user) {
      console.log("error");
      return res.status(401).json({ error: 'Authentication1 failed' });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("Password is match:",passwordMatch);
    if (!passwordMatch) {
      console.log("pas")
      return res.status(401).json({ error: 'password wrong' });
    }
    const token = jwt.sign(
      { userId: user._id, username: user.username }, // Payload
      process.env.JWT_KEY, // Secret key
      { expiresIn: '365d' } // Expires in 365 days
    );
    console.log("token:",token);
    res.status(200).json({ success:true,Message:"Login Success",token });
    } catch (error) {
      console.log("Error:", error);
    res.status(500).json({ error: 'Login failed' });
    }
});




router.post('/admin_login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const trimmedUsername = username.trim();

    // Case-insensitive search
    const user = await admin.findOne({ 
      username: { $regex: new RegExp(`^${trimmedUsername}$`, 'i') }
    });

    console.log('User found:', user); // Debugging

    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication failed - user not found' 
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication failed - wrong password' 
      });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_KEY,
      { expiresIn: '365d' }
    );

    res.status(200).json({ 
      success: true,
      message: "Login Success",
      token,
      user: {
        id: user._id,
        username: user.username
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ 
      success: false,
      error: 'Login failed' 
    });
  }
});
























router.post('/update-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    console.log(req.body);
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

    // Find local government
    const localGovernment = await LocalGovernment.findById(req.user.userId);
    if (!localGovernment) {
      return res.status(404).json({ 
        success: false,
        message: 'Local government not found' 
      });
    }

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, localGovernment.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: 'Current password is incorrect' 
      });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    localGovernment.password = hashedPassword;
    await localGovernment.save();

    // Send email notification
    const mailOptions = {
      from: `"POPULUS Support" <${process.env.EMAIL_USER}>`,
      to: localGovernment.email,
      subject: 'Password Updated Successfully',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Password Updated</h2>
          <p>Your password for the ${localGovernment.locality} local government account has been successfully changed.</p>
          
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




router.post('/signup', async (req, res) => {
  try {
    console.log("Local government add");
    console.log(req.body);

    const { locality, phone, email, district } = req.body;

    // Validate required fields
    if (!locality || !phone || !email) {
      return res.status(400).json({ error: "Locality, phone number, and email are required" });
    }

    // Validate phone number format (10 digits)
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: "Invalid phone number format (must be 10 digits)" });
    }

    // // Generate username: locality + random 4 digits
    // const randomDigits = Math.floor(1000 + Math.random() * 9000);
    // const username = `${locality.replace(/\s+/g, '_').toLowerCase()}_${randomDigits}`;
    
    // Generate random 8-character password
    const password = Math.random().toString(36).slice(-8);
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create a new local government with the hashed password
    const reqgovernment = new LocalGovernment({
      selfGovType: req.body.selfGovType, // Ensure this field is included in the request
      locality,
      email,
      district,
      phone,
      username:locality,
      password: hashedPassword,
    });

    // Save the local government to the database
    await reqgovernment.save();

    console.log("Local government saved:", reqgovernment);

    const mailOptions = {
      from: `"Support Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Our Service - Account Created Successfully',
      text: `Dear ${locality},\n\nThank you for registering with us! Your account has been successfully created.\n\nHere are your login details:\nUsername: ${username}\nPassword: ${password}\n\nFor security reasons, we recommend changing your password after your first login.\n\nIf you didn't request this account, please contact our support team immediately.\n\nBest regards,\nThe Support Team`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Welcome, ${locality}!</h2>
        <p>Thank you for registering with us! Your account has been successfully created.</p>
        
        <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #3498db; margin: 15px 0;">
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
        
        <p>For security reasons, we recommend changing your password after your first login.</p>
        <p>If you didn't request this account, please contact our support team immediately.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>The Support Team</p>
      </div>`
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });

    res.status(201).json({ message: "SignUp details saved successfully. Check your email for confirmation." });
  } catch (error) {
    console.log("Error during signup:", error);
    res.status(400).json({ error: error.message });
  }
});

















router.post('/map', authenticateToken, async (req, res) => {
  try {
    const username = req.user.username;
    console.log("Fetching map data for president:", username);
    
    // Fetch only the required fields where presidentId matches the username
    const data = await VerifiedUsers.find(
      { presidentId: username },
      { houseDetails: 1, mappedHouse: 1, wardNumber: 1, rationId:1, _id: 0 }
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



router.post("/create_survey", authenticateToken, async (req, res) => {
  try {
    const { title, question, options } = req.body;
    console.log("goverment")
   
    const creator = req.user.username;
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



router.post("/mysurvey", authenticateToken, async (req, res) => {
  try {
    console.log("Fetching presidentId for user");
    const userId = req.user.username;
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




router.post("/completesurvey", authenticateToken, async (req, res) => {
  try {
    const { surveyId } = req.body; // Using camelCase for consistency

    // Validate input
    if (!surveyId) {
      return res.status(400).json({ message: "Survey ID is required" });
    }

    // Update the survey and get the result
    const result = await Survey.updateOne(
      { _id: surveyId },
      { $set: { active: false } }
    );

    // Check if any document was modified
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Survey not found" });
    }

    res.status(200).json({ 
      success: true,
      message: "Survey marked as completed successfully"
    });

  } catch (error) {
    console.error("Error completing survey:", error);
    
    // Handle specific errors
    if (error.name === 'CastError') {
      return res.status(400).json({ message: "Invalid Survey ID format" });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: error.message 
    });
  }
});









router.get('/profile/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    console.log(`Fetching profile for username: ${username}`);

    // Case-insensitive search and proper field selection
    const user = await LocalGovernment.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    }).select('-password -__v -tokens');

    if (!user) {
      console.log(`User not found: ${username}`);
      return res.status(404).json({ 
        success: false,
        message: 'Government user not found'
      });
    }

    console.log('Found user:', user);
    
    const profileData = {
      _id: user._id,
      selfGovType: user.selfGovType,
      district: user.district,
      locality: user.locality,
      email: user.email,
      phone: user.phone,
      username: user.username,  
      createdAt: user.createdAt
    };

    res.status(200).json({
      success: true,
      data: profileData
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching government profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/gov_display', authenticateToken, async (req, res) => {
  try {
    const access  = req.user.username;
    console.log(access);
    if (!access) {
      return res.status(400).json({ message: 'Access parameter is required' });
    }

    // Get feedbacks matching the access level
    const feedbacks = await Feedback.find({ access })
      .sort({ createdAt: -1 }) // Sort by newest first
      .select('-__v');
    
    res.json(feedbacks);
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id/do', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    console.log(status);
    // Validate status
    if (!status || !['pending', 'inProgress', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required' });
    }

    // Find feedback
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    

    // Update status
    feedback.status = status;
    
    // Add audit trail if needed
    // feedback.statusHistory.push({ status, updatedBy: req.user.id, updatedAt: Date.now() });
    
    await feedback.save();
    
    res.json(feedback);
  } catch (error) {
    console.error('Error updating feedback:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});




export default router
