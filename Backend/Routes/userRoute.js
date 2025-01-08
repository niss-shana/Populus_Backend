import express  from 'express';
import Resident from '../models/requser.js';
const router = express.Router();

router.post('/resident_signup', async (req, res) => {
  try {
    console.log("resident add");
    console.log(req.body);
    const newResident = new Resident(req.body);
    await newResident.save();
    console.log(newResident);
    res.status(201).json({message:"Message successfuly"});
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;