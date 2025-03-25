import express  from 'express';
import RequestUsers from '../models/requser.js';
import VerifiedUsers from '../models/verUsers.js';
import LocalGovernment from '../models/locgov.js';
import Department from '../models/department.js';
import jwt from 'jsonwebtoken';
const router = express.Router();




router.post('/signup', async (req, res) => {
    try {
      
      console.log(req.body);
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
  
      // Create a new resident with the hashed password
      const reqDepartment = new Department({
        ...req.body,
        password: hashedPassword, // Replace the plain password with the hashed one
      });
  
      await reqDepartment.save();
  
      console.log(reqDepartment);
      const demo = await Department.find();
      console.log(demo);
  
      res.status(201).json({ message: "SignUp details saved successfully" });
    } catch (error) {
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
    // const passwordMatch = await bcrypt.compare(password, user.password);
    const passwordMatch = (password === user.password);//temporary
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







// GET /government/profile/:username
router.get('/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Find user by username
    const user = await Department.findOne({ username });
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
      department: user.department,
      locality: user.localBody,
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
