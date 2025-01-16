import express  from 'express';
import RequestUsers from '../models/requser.js';
import VerifiedUsers from '../models/verUsers.js';
const router = express.Router();
import jwt from 'jsonwebtoken'; // Add this import

import bcrypt from 'bcrypt';
const saltRounds = 10; // Number of salt rounds for bcrypt

router.post('/resident_signup', async (req, res) => {
  try {
    console.log("resident add");
    console.log(req.body);

    // Hash the password
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    // Create a new resident with the hashed password
    const reqResident = new RequestUsers({
      ...req.body,
      password: hashedPassword, // Replace the plain password with the hashed one
    });

    await reqResident.save();

    console.log(reqResident);
    const demo = await RequestUsers.find();
    console.log(demo);

    res.status(201).json({ message: "Resident saved successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/resident_login', async (req, res) => {
  try {
    console.log(req.body);
    const { username, password } = req.body;
    console.log(username);
    const user = await RequestUsers.findOne({username: username });
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
router.get('/check-username/:username', async (req, res) => {
  const { username } = req.params;
  try {
    // Check if the username exists in the database
    const existingUser = await RequestUsers.findOne({ username });

    if (existingUser) {
      // Username is already taken
      return res.json({ available: false });
    }

    // Username is available
    res.json({ available: true });
  } catch (error) {
    console.error('Error checking username availability:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;