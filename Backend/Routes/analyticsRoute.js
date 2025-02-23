import express from 'express';
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
    req.user = user;
    next();
  });
};

router.use((req, res, next) => {
  if (req.path === '/login' || req.path === '/signup') {
    return next();
  }
  authenticateToken(req, res, next);
});





router.post("/result", authenticateToken, async (req, res) => {
  try {
    const { surveyId } = req.body;

    if (!surveyId) {
      return res.status(400).json({ error: "Survey ID is required" });
    }

    const dataset = await Result.find({ surveyid: surveyId });

    if (dataset.length === 0) {
      return res.status(404).json({ error: "No results found for this survey" });
    }

    // Group and process data
    const optionCounts = dataset.reduce((acc, item) => {
      acc[item.option] = (acc[item.option] || 0) + 1;
      return acc;
    }, {});

    const optionsData = Object.entries(optionCounts)
      .map(([option, count]) => ({
        _id: option,
        count: count,
      }))
      .sort((a, b) => b.count - a.count);

    // Enhanced histogram generation
    const canvas = createCanvas(1000, 600);
    const ctx = canvas.getContext("2d");
    
    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Constants for chart layout
    const margin = { top: 60, right: 40, bottom: 100, left: 60 }; // Increased bottom margin
    const chartWidth = canvas.width - margin.left - margin.right;
    const chartHeight = canvas.height - margin.top - margin.bottom;
    const barPadding = 0.2;
    const barWidth = (chartWidth / optionsData.length) * (1 - barPadding);

    // Title
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = "#1f2937";
    ctx.textAlign = "center";
    ctx.fillText("Histogram", canvas.width / 2, margin.top / 2);

    // Y-axis
    const maxCount = Math.max(...optionsData.map(d => d.count));
    const yScale = chartHeight / maxCount;

    ctx.beginPath();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, canvas.height - margin.bottom);
    ctx.stroke();

    // Y-axis labels and grid lines
    const yTickCount = 5;
    for (let i = 0; i <= yTickCount; i++) {
      const y = margin.top + (chartHeight * i) / yTickCount;
      const value = Math.round(maxCount - (maxCount * i) / yTickCount);
      
      // Grid lines
      ctx.beginPath();
      ctx.strokeStyle = "#e2e8f0";
      ctx.moveTo(margin.left, y);
      ctx.lineTo(canvas.width - margin.right, y);
      ctx.stroke();

      // Y-axis labels
      ctx.font = "12px Arial";
      ctx.fillStyle = "#64748b";
      ctx.textAlign = "right";
      ctx.fillText(value.toString(), margin.left - 10, y + 4);
    }

    // X-axis
    ctx.beginPath();
    ctx.strokeStyle = "#94a3b8";
    ctx.moveTo(margin.left, canvas.height - margin.bottom);
    ctx.lineTo(canvas.width - margin.right, canvas.height - margin.bottom);
    ctx.stroke();

    // Draw bars with labels
    optionsData.forEach((option, index) => {
      const x = margin.left + (chartWidth / optionsData.length) * index + barPadding * barWidth;
      const barHeight = option.count * yScale;
      
      // Create gradient
      const gradient = ctx.createLinearGradient(0, canvas.height - margin.bottom - barHeight, 0, canvas.height - margin.bottom);
      gradient.addColorStop(0, "#3b82f6");
      gradient.addColorStop(1, "#60a5fa");
      
      // Bar with shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, canvas.height - margin.bottom - barHeight, barWidth, barHeight);
      
      // Reset shadow
      ctx.shadowColor = "transparent";

      // Option name label
      ctx.save();
      ctx.font = "bold 14px Arial";
      ctx.fillStyle = "#1f2937";
      ctx.textAlign = "left";
      ctx.translate(x + barWidth / 2, canvas.height - margin.bottom + 20);
      ctx.rotate(Math.PI / 4);
      
      // Create a background rectangle for better readability
      const textMetrics = ctx.measureText(option._id);
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillRect(-5, -15, textMetrics.width + 10, 20);
      
      // Draw the text
      ctx.fillStyle = "#1f2937";
      ctx.fillText(option._id, 0, 0);
      ctx.restore();

      // Count label on top of bar
      ctx.font = "bold 14px Arial";
      ctx.fillStyle = "#1f2937";
      ctx.textAlign = "center";
      
      // Draw count with background
      const countText = `Count: ${option.count}`;
      const countMetrics = ctx.measureText(countText);
      const labelX = x + barWidth / 2;
      const labelY = canvas.height - margin.bottom - barHeight - 25;
      
      // Background for count label
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillRect(
        labelX - countMetrics.width / 2 - 5,
        labelY - 15,
        countMetrics.width + 10,
        20
      );
      
      // Draw count text
      ctx.fillStyle = "#1f2937";
      ctx.fillText(countText, labelX, labelY);
    });

    // Add Y-axis title
    ctx.save();
    ctx.translate(20, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = "bold 14px Arial";
    ctx.fillStyle = "#1f2937";
    ctx.textAlign = "center";
    ctx.fillText("Number of Responses", 0, 0);
    ctx.restore();

    // Convert canvas to Base64 image
    const imageUrl = canvas.toDataURL("image/png");

    res.json({
      results: optionsData.map((d) => ({ 
        question: d._id, 
        answers: [d.count.toString()] 
      })),
      image: imageUrl,
    });

  } catch (error) {
    console.error("Error generating histogram:", error);
    res.status(500).json({ error: "Failed to generate histogram" });
  }
});




router.post("/gender", authenticateToken, async (req, res) => {
  try {
    const { surveyId } = req.body;

    if (!surveyId) {
      return res.status(400).json({ error: "Survey ID is required" });
    }

    const dataset = await Result.find({ surveyid: surveyId });

    if (dataset.length === 0) {
      return res.status(404).json({ error: "No results found for this survey" });
    }

    // Extract all unique usernames from results
    const usernames = dataset.map(result => result.user);
    
    // Get corresponding verified users' genders
    const verifiedUsers = await VerifiedUsers.find({ 
      username: { $in: usernames } 
    });

    // Create username-to-gender mapping
    const genderMap = {};
    verifiedUsers.forEach(user => {
      genderMap[user.username] = user.gender;
    });

    // Create final dataset with option and gender
    const genderData = dataset.map(result => ({
      option: result.option,
      gender: genderMap[result.user] || 'unknown' // Handle missing genders
    }));

    res.status(200).json(genderData);

  } catch (error) {
    console.error("Error fetching gender data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});    




















export default router;