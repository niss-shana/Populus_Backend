import express  from 'express';
import RequestUsers from '../models/requser.js';
import VerifiedUsers from '../models/verUsers.js';
import LocalGovernment from '../Models/locgov.js';
const router = express.Router();









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





router.post('/login', async (req, res) => {
  try {
    console.log(req.body);
    const { username, password } = req.body;
    console.log(username);
    const user = await LocalGovernment.findOne({username: username });
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
    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY, {
    expiresIn: '1h',
    });
    console.log("token:",token);
    res.status(200).json({ success:true,Message:"Login Success",token });
    } catch (error) {
    res.status(500).json({ error: 'Login failed' });
    }
});






router.post('/signup', async (req, res) => {
  try {
    console.log("local government add");
    console.log(req.body);

    // Hash the password
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
    console.log("Hashing error:", error);


    // Create a new resident with the hashed password
    const reqgovernment = new LocalGovernment({
      ...req.body,
      password: hashedPassword, // Replace the plain password with the hashed one
    });

    await reqgovernment.save();

    console.log(reqgovernment);
    const demo = await LocalGovernment.find();
    console.log(demo);

    res.status(201).json({ message: "SignUp details saved successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});














export default router
