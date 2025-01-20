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















export default router
