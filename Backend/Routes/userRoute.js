import express  from 'express';
import RequestUsers from '../models/requser.js';
const router = express.Router();

router.post('/resident_signup', async (req, res) => {
  try {
    console.log("resident add");
    console.log(req.body);
    const reqResident = new RequestUsers(req.body);
    await reqResident.save();
    console.log(newResident);
    const demo = await Resident.find();
    console.log(demo);
    res.status(201).json({message:"Message successfuly"});
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;