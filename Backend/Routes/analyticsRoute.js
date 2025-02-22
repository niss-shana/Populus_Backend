import express  from 'express';
const router = express.Router();
import Result from '../Models/Result.js';
import { createCanvas } from 'canvas';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';


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

// Apply the middleware globally to all routes except `/login` and `/signup`
router.use((req, res, next) => {
  if (req.path === '/login' || req.path === '/signup') {
    return next(); // Skip authentication for these routes
  }
  authenticateToken(req, res, next); // Apply authentication to all other routes
});







// 2. Updated Route with Histogram Generation


router.post("/result", authenticateToken, async (req, res) => {
  try {
    const { surveyId } = req.body;

    if (!surveyId) {
      return res.status(400).json({ error: "Survey ID is required" });
    }

    // Fetch dataset
    const dataset = await Result.find({ surveyid: surveyId });
    console.log(dataset);

    if (dataset.length === 0) {
      console.log("onnulla");
      return res.status(404).json({ error: "No results found for this survey" });
    }

    // Group dataset by 'option' field
    const optionCounts = dataset.reduce((acc, item) => {
      acc[item.option] = (acc[item.option] || 0) + 1;
      return acc;
    }, {});

    // Convert to an array for sorting
    const optionsData = Object.entries(optionCounts).map(([option, count]) => ({
      _id: option,
      count: count,
    }));

    optionsData.sort((a, b) => b.count - a.count);

    // Generate histogram image
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    optionsData.forEach((option, index) => {
      const barHeight = (option.count / Math.max(...optionsData.map((d) => d.count))) * 300;
      ctx.fillStyle = ["#4F46E5", "#10B981", "#EF4444", "#F59E0B"][index % 4];
      ctx.fillRect(40 + index * 60, 350 - barHeight, 40, barHeight);
    });

    // Convert canvas to Base64 image
    const imageUrl = canvas.toDataURL("image/png");

    res.json({
      results: optionsData.map((d) => ({ question: d._id, answers: [d.count.toString()] })),
      image: imageUrl,
    });
  } catch (error) {
    console.error("Error generating histogram:", error);
    res.status(500).json({ error: "Failed to generate histogram" });
  }
});
  
















export default router
