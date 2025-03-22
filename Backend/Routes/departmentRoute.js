import express  from 'express';
import RequestUsers from '../models/requser.js';
import VerifiedUsers from '../models/verUsers.js';
import LocalGovernment from '../models/locgov.js';
import Department from '../models/department.js';
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
  
      console.log(reqDepartmentt);
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















export default router
