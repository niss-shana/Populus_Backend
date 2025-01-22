import express  from 'express';
import RequestUsers from '../models/requser.js';
import VerifiedUsers from '../models/verUsers.js';
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    console.log(req.body)
   
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/signup', async (req, res) => {
  try {
    console.log(req.body)
   
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
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
    const data = await VerifiedUsers.find({ houseDetails }).select('name dateOfBirth gender houseDetails place locality district mobileNo aadhaarNo');

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
