import express from 'express';
import Feedback from '../models/feedback.js'; // Changed to uppercase to match usage
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import asyncHandler from 'express-async-handler'; // Added missing import

const router = express.Router();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  jwt.verify(token, process.env.JWT_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token." });
    }
    console.log("Decoded user payload:", user); // Debugging
    req.user = user; // Attach the user payload to the request object
    next();
  });
};

router.post('/create', authenticateToken,asyncHandler(async (req, res) => {

    console.log("feedback creare")
  const { type, subject, message, name, email, isAnonymous } = req.body;

  // Validate required fields
  if (!type || !subject || !message) {
    return res.status(400).json({ message: 'Type, subject and message are required' });
  }

  // Validate non-anonymous submissions have contact info
  if (!isAnonymous && (!name || !email)) {
    return res.status(400).json({ message: 'Name and email are required for non-anonymous submissions' });
  }
  const access = req.user.access;
  const userId = req.user.userId;
  console.log("access:",req.user.access);
  // Create new feedback
  const newFeedback = new Feedback({
    type,
    subject,
    message,
    access,
    userId,
    isAnonymous,
    // Only include personal info if not anonymous
    ...(isAnonymous ? {} : { name, email })
  });

  const savedFeedback = await newFeedback.save();
  console.log("create feedback",savedFeedback);
//   // For non-anonymous feedback, we might want to send an email notification
//   if (!isAnonymous) {
//     // Email sending logic would go here
//     console.log(`Email notification would be sent to ${email}`);
//   }

  res.status(201).json({
    success: true,
    message: `${type} submitted successfully`,
    id: savedFeedback._id
  });
}));

router.get('/display', authenticateToken, asyncHandler(async (req, res) => {
    console.log("Fetching feedback for user:", req.user.userId, "with access:", req.user.access);
    
    try {
         // Find feedback created by this specific user
            const feedback = await Feedback.find({ userId: req.user.userId })
            .sort({ createdAt: -1 }); // Newest first
        console.log(feedback);
        console.log(`Found ${feedback.length} feedback items for user ${req.user.userId}`);
        const suggestions = feedback.filter(f => f.type === 'suggestion');
    const complaints = feedback.filter(f => f.type === 'complaint');
        res.json({
            success: true,
            data: feedback,
            userId: req.user.userId,
            count: feedback.length,
            suggestions,
            complaints
        });
      
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch feedback",
        error: error.message 
      });
    }
  }));

router.put('/:id/status', authenticateToken, asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  if (!status || !['pending', 'inProgress', 'resolved'].includes(status)) {
    return res.status(400).json({ message: 'Valid status is required' });
  }
  
  const feedback = await Feedback.findById(req.params.id);
  
  if (!feedback) {
    return res.status(404).json({ message: 'Feedback not found' });
  }
  
  feedback.status = status;
  await feedback.save();
  
  // If the feedback is not anonymous and status changed to resolved,
  // we might want to notify the user
  if (!feedback.isAnonymous && status === 'resolved' && feedback.email) {
    // Email notification logic would go here
    console.log(`Resolution notification would be sent to ${feedback.email}`);
  }
  
  res.json({ success: true, feedback });
}));

router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);
  
  if (!feedback) {
    return res.status(404).json({ message: 'Feedback not found' });
  }
  
  res.json(feedback);
}));



 
  // router.delete('/:id', authenticateToken, async (req, res) => {
  //   try {
  //     const feedback = await Feedback.findById(req.params.id);
      
  //     if (!feedback) {
  //       return res.status(404).json({ message: 'Feedback not found' });
  //     }
  
  //     // Check if user has admin rights for this access level
  //     if (req.user.role !== 'admin' || feedback.access !== req.user.access) {
  //       return res.status(403).json({ message: 'Access denied. Only admins can delete feedback' });
  //     }
  
  //     await feedback.remove();
      
  //     res.json({ message: 'Feedback removed' });
  //   } catch (error) {
  //     console.error('Error deleting feedback:', error);
      
  //     if (error.kind === 'ObjectId') {
  //       return res.status(404).json({ message: 'Feedback not found' });
  //     }
      
  //     res.status(500).json({ message: 'Server error' });
  //   }
  // });
  

  // router.get('/stats', authenticateToken, async (req, res) => {
  //   try {
  //     const { access } = req.query;
      
  //     if (!access) {
  //       return res.status(400).json({ message: 'Access parameter is required' });
  //     }
  
  //     // Check if user has admin rights for this access level
  //     if (req.user.role !== 'admin' || req.user.access !== access) {
  //       return res.status(403).json({ message: 'Access denied. Only admins can view statistics' });
  //     }
  
  //     // Get counts
  //     const totalCount = await Feedback.countDocuments({ access });
  //     const suggestionCount = await Feedback.countDocuments({ access, type: 'suggestion' });
  //     const complaintCount = await Feedback.countDocuments({ access, type: 'complaint' });
      
  //     // Status counts
  //     const pendingCount = await Feedback.countDocuments({ access, status: 'pending' });
  //     const inProgressCount = await Feedback.countDocuments({ access, status: 'inProgress' });
  //     const resolvedCount = await Feedback.countDocuments({ access, status: 'resolved' });
      
  //     // Monthly trends (last 6 months)
  //     const sixMonthsAgo = new Date();
  //     sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
  //     const monthlyTrends = await Feedback.aggregate([
  //       { 
  //         $match: { 
  //           access, 
  //           createdAt: { $gte: sixMonthsAgo } 
  //         } 
  //       },
  //       {
  //         $group: {
  //           _id: { 
  //             year: { $year: "$createdAt" }, 
  //             month: { $month: "$createdAt" },
  //             type: "$type"
  //           },
  //           count: { $sum: 1 }
  //         }
  //       },
  //       { $sort: { "_id.year": 1, "_id.month": 1 } }
  //     ]);
  
  //     res.json({
  //       total: totalCount,
  //       byType: {
  //         suggestion: suggestionCount,
  //         complaint: complaintCount
  //       },
  //       byStatus: {
  //         pending: pendingCount,
  //         inProgress: inProgressCount,
  //         resolved: resolvedCount
  //       },
  //       monthlyTrends
  //     });
  //   } catch (error) {
  //     console.error('Error fetching feedback statistics:', error);
  //     res.status(500).json({ message: 'Server error' });
  //   }
  // });


export default router; // Changed from module.exports to ES6 export