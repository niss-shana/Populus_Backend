import express from 'express';
import Announcement from '../models/announcement.js';

const router = express.Router();

// Create Announcement
router.post('/create', async (req, res) => {
  try {
    const { department, time, title, message } = req.body;

    // Validate required fields
    if (!department || !time || !title || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate time format
    if (isNaN(Date.parse(time))) {
      return res.status(400).json({ error: 'Invalid time format' });
    }

    // Create a new announcement
    const newAnnouncement = new Announcement({
      department,
      time,
      title,
      message,
    });

    // Save the new announcement to the database
    await newAnnouncement.save();

    return res.status(201).json({
      message: 'Announcement created successfully!',
      announcement: newAnnouncement,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server Error' });
  }
});

// Delete Announcement
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete the announcement by its ID
    const deletedAnnouncement = await Announcement.findByIdAndDelete(id);

    if (!deletedAnnouncement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    return res.status(200).json({
      message: 'Announcement deleted successfully!',
      deletedAnnouncement,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server Error' });
  }
});

// Get All Announcements
router.get('/display', async (req, res) => {
    try {
      const announcements = await Announcement.find();
      console.log('Announcements fetched:', announcements); // Log fetched data
      return res.status(200).json({ announcements });
    } catch (err) {
      console.error('Error fetching announcements:', err);
      return res.status(500).json({ error: 'Server Error' });
    }
  });
  

export default router;
