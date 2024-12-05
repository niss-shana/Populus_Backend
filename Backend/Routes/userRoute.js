import express  from 'express';
import Resident from '../models/requser.js';
const router = express.Router();

router.post('/add', async (req, res) => {
  const { name, address, ward } = req.body;
  const newResident = new Resident({ name, address, ward });
  await newResident.save();
  res.status(201).json(newResident);
});

export default router;