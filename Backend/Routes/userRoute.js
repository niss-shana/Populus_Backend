import express  from 'express';
import Resident from '../models/requser.js';
const router = express.Router();

router.post('/resident_signup', async (req, res) => {
  try {
    console.log("resident add");
    const newResident = new Resident(req.body);
    const savedResident = await newResident.save();
    res.status(201).json(savedResident);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;