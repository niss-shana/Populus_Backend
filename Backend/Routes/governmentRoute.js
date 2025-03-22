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
  if (req.path === '/login' || req.path === '/signup'|| '/verify-user' ||'/map'||'/housedetails' ) {
    return next(); // Skip authentication for these routes
  }
  authenticateToken(req, res, next); // Apply authentication to all other routes
});


router.get('/users', async (req, res) => {
  try {
    const users = await RequestUsers.find();
    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }
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

 


router.post('/adding_residents', async (req, res) => {
  try {
    const { _id, ...userDetails } = req.body; // Extract user details
    userDetails.presidentId = req.body.presidentId || 'unknown'; // Add presidentId

    // Save to verified users collection
    const verifiedUser = new VerifiedUsers(userDetails);
    await verifiedUser.save();



    // Send email with username and password
    const mailOptions = {
      from: process.env.EMAIL_USER, // Sender email
      to: userDetails.email, // Recipient email
      subject: 'Your Account Has Been Verified', // Email subject
      text: `Dear ${userDetails.name},\n\nYour account has been verified. Here are your login credentials:\n\nUsername: ${userDetails.username}\nPassword: ${userDetails.password}\n\nPlease keep this information secure.\n\nBest regards,\nYour Organization`, // Email body
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'User verified successfully and email sent.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




router.post('/verify-user', async (req, res) => {
  try {
    const { _id, ...userDetails } = req.body; // Extract user details
    userDetails.presidentId = req.body.presidentId || 'unknown'; // Add presidentId

    const verifiedUser = new VerifiedUsers(userDetails);
    await verifiedUser.save(); // Save to verified users collection

    // Remove the user from unverified collection
    await RequestUsers.findByIdAndDelete(_id);

    res.status(200).json({ message: 'User verified successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
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






router.post('/signup', async (req, res) => {
  try {
    console.log("local government add");
    console.log(req.body);
    
    const saltRounds = 10;
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
    
    // Create a new resident with the hashed password
    const reqgovernment = new LocalGovernment({
      ...req.body,
      password: hashedPassword // Replace the plain password with the hashed one
    });
    
    await reqgovernment.save();
    
    console.log(reqgovernment);
    const demo = await LocalGovernment.find();
    console.log(demo);
    
    res.status(201).json({ message: "SignUp details saved successfully" });
  } catch (error) {
    console.log("Error during signup:", error);
    res.status(400).json({ error: error.message });
  }
});


















router.post('/map', async (req, res) => {
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






router.post('/housedetails', async (req, res) => {
  try {
    console.log("labeeee")
    console.log(req.body)
    console.log("hi")
    // Retrieve houseDetails from the request body
    const { houseDetails } = req.body;
    console.log("hi")

    // Ensure houseDetails is provided
    if (!houseDetails) {
      return res.status(400).json({ error: 'houseDetails is required' });
    }

    // Query the database for the house details
    const data = await VerifiedUsers.find({ houseDetails }).select('name dateOfBirth gender houseDetails place locality district mobileNo aadhaarNo rationId');
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









// GET /government/profile/:username
router.get('/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Find user by username
    const user = await LocalGovernment.findOne({ username });
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
      selfGovType: user.selfGovType,
      localBody: user.localBody,
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







export default router
