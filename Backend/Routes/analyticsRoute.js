import express from 'express';
const router = express.Router();
import Result from '../models/Result.js';
import { createCanvas } from 'canvas';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import VerifiedUsers from '../models/verUsers.js';
import axios from 'axios';
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    radius = { ...{ tl: 0, tr: 0, br: 0, bl: 0 }, ...radius };
  }

  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();

  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}


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
const canvas = createCanvas(1200, 800);
const ctx = canvas.getContext('2d');


function calculateAge(dateOfBirth) {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}
function createEnhancedBarChart(ctx, canvas, options, counts, type) {
  // Canvas dimensions and margins
  const width = canvas.width;
  const height = canvas.height;
  const margin = { top: 80, right: 120, bottom: 120, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Background with gradient
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, "#f9fafb");
  bgGradient.addColorStop(1, "#f3f4f6");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw border and shadow effect
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Add title with shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.font = "bold 32px Arial, sans-serif";
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.fillText(
    type === "gender"
      ? "Gender Distribution by Response Option"
      : "Ration Card Distribution by Response Option",
    width / 2,
    margin.top / 2 + 10
  );
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Calculate total counts for each option
  const totalCounts = options.map((option) => {
    if (type === "gender") {
      return counts[option].Male + counts[option].Female;
    } else {
      return (
        counts[option].Yellow +
        counts[option].Pink +
        counts[option].Blue +
        counts[option].White
      );
    }
  });
  const totalResponses = totalCounts.reduce((sum, count) => sum + count, 0);

  // Calculate bar widths based on total counts (proportional)
  const barWidth = (chartWidth / options.length) * 0.8;
  const barSpacing = (chartWidth / options.length) * 0.2;

  // Draw axes
  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 2;

  // X-axis
  ctx.beginPath();
  ctx.moveTo(margin.left, height - margin.bottom);
  ctx.lineTo(margin.left + chartWidth, height - margin.bottom);
  ctx.stroke();

  // Y-axis
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, height - margin.bottom);
  ctx.stroke();

  // Modern color palette for categories
  const colors =
    type === "gender"
      ? {
          Male: {
            gradient: ["#3b82f6", "#1d4ed8"], // Blue gradient
            border: "#1e40af",
          },
          Female: {
            gradient: ["#ec4899", "#be185d"], // Pink gradient
            border: "#9d174d",
          },
        }
      : {
          Yellow: {
            gradient: ["#fcd34d", "#f59e0b"], // Yellow gradient
            border: "#d97706",
          },
          Pink: {
            gradient: ["#ec4899", "#be185d"], // Pink gradient
            border: "#9d174d",
          },
          Blue: {
            gradient: ["#3b82f6", "#1d4ed8"], // Blue gradient
            border: "#1e40af",
          },
          White: {
            gradient: ["#f3f4f6", "#d1d5db"], // White gradient
            border: "#9ca3af",
          },
        };

  // Draw bars with enhanced styling
  let x = margin.left + barSpacing / 2;
  options.forEach((option, index) => {
    let segmentHeights = [];
    if (type === "gender") {
      segmentHeights = [
        (counts[option].Male / totalCounts[index]) * chartHeight,
        (counts[option].Female / totalCounts[index]) * chartHeight,
      ];
    } else {
      segmentHeights = [
        (counts[option].Yellow / totalCounts[index]) * chartHeight,
        (counts[option].Pink / totalCounts[index]) * chartHeight,
        (counts[option].Blue / totalCounts[index]) * chartHeight,
        (counts[option].White / totalCounts[index]) * chartHeight,
      ];
    }

    let y = height - margin.bottom;
    Object.keys(colors).forEach((key, i) => {
      const height = segmentHeights[i];
      if (height > 0) {
        const gradient = ctx.createLinearGradient(
          x,
          y - height,
          x + barWidth,
          y
        );
        gradient.addColorStop(0, colors[key].gradient[0]);
        gradient.addColorStop(1, colors[key].gradient[1]);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.rect(x, y - height, barWidth, height);
        ctx.fill();

        ctx.strokeStyle = colors[key].border;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Add percentage labels if enough space
        if (barWidth > 50 && height > 30) {
          ctx.font = "bold 16px Arial, sans-serif";
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText(
            `${Math.round((segmentHeights[i] / chartHeight) * 100)}%`,
            x + barWidth / 2,
            y - height / 2 + 6
          );
        }

        y -= height;
      }
    });

    // Option label with rotation for long text
    ctx.save();
    ctx.translate(x + barWidth / 2, height - margin.bottom + 20);

    // Rotate labels if option text is long
    if (option.length > 10 && barWidth < 100) {
      ctx.rotate(Math.PI / 6);
    }

    ctx.font = "bold 16px Arial, sans-serif";
    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.fillText(option, 0, 0);

    // Add total count below option
    ctx.font = "14px Arial, sans-serif";
    ctx.fillStyle = "#4b5563";
    ctx.fillText(`(n=${totalCounts[index]})`, 0, 24);

    ctx.restore();

    // Move to the next bar
    x += barWidth + barSpacing;
  });

  // Draw Y-axis title with rotation
  ctx.save();
  ctx.translate(25, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "bold 18px Arial, sans-serif";
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.fillText(
    type === "gender" ? "Gender Proportion" : "Ration Card Proportion",
    0,
    0
  );
  ctx.restore();

  // Draw X-axis title
  ctx.font = "bold 18px Arial, sans-serif";
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.fillText("Response Options", width / 2, height - 30);

  // Create an enhanced legend
  const legendX = width - margin.right + 20;
  const legendY = margin.top;
  const legendWidth = type === "gender" ? 90 : 120;
  const legendHeight = type === "gender" ? 130 : 180;

  // Legend background
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 1;
  roundRect(ctx, legendX - 10, legendY, legendWidth, legendHeight, 8, true, true);

  // Legend title
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.fillStyle = "#111827";
  ctx.textAlign = "left";
  ctx.fillText(type === "gender" ? "Gender" : "Ration Card", legendX, legendY + 25);

  // Legend items
  const legendItems = Object.keys(colors).map((key, i) => ({
    label: key,
    color: colors[key].gradient[0],
    y: legendY + 55 + i * 35,
  }));

  legendItems.forEach((item) => {
    // Color box
    ctx.fillStyle = item.color;
    roundRect(ctx, legendX, item.y - 12, 20, 20, 4, true, false);

    // Label
    ctx.font = "15px Arial, sans-serif";
    ctx.fillStyle = "#111827";
    ctx.textAlign = "left";
    ctx.fillText(item.label, legendX + 30, item.y);
  });

  // Add a note about the visualization
  ctx.font = "italic 14px Arial, sans-serif";
  ctx.fillStyle = "#4b5563";
  ctx.textAlign = "center";
  ctx.fillText(
    "* Height of each bar represents proportion of total responses",
    width / 2,
    height - 60
  );

  // Add dataset information
  ctx.font = "italic 14px Arial, sans-serif";
  ctx.fillStyle = "#4b5563";
  ctx.textAlign = "center";
  ctx.fillText(`Total responses: ${totalResponses}`, width / 2, height - 80);

  // Draw a border around the chart area
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.strokeRect(margin.left, margin.top, chartWidth, chartHeight);

  // Add notes for missing data
  if (type === "gender") {
    if (!options.some((option) => counts[option].Female > 0)) {
      ctx.font = "bold 16px Arial, sans-serif";
      ctx.fillStyle = "#ef4444";
      ctx.textAlign = "center";
      ctx.fillText("Note: No female responses detected in this dataset", width / 2, height - 100);
    }
  } else {
    if (!options.some((option) => counts[option].Yellow > 0)) {
      ctx.font = "bold 16px Arial, sans-serif";
      ctx.fillStyle = "#ef4444";
      ctx.textAlign = "center";
      ctx.fillText("Note: No Yellow Card responses detected in this dataset", width / 2, height - 100);
    }
    if (!options.some((option) => counts[option].Pink > 0)) {
      ctx.font = "bold 16px Arial, sans-serif";
      ctx.fillStyle = "#ef4444";
      ctx.textAlign = "center";
      ctx.fillText("Note: No Pink Card responses detected in this dataset", width / 2, height - 120);
    }
    if (!options.some((option) => counts[option].Blue > 0)) {
      ctx.font = "bold 16px Arial, sans-serif";
      ctx.fillStyle = "#ef4444";
      ctx.textAlign = "center";
      ctx.fillText("Note: No Blue Card responses detected in this dataset", width / 2, height - 140);
    }
    if (!options.some((option) => counts[option].White > 0)) {
      ctx.font = "bold 16px Arial, sans-serif";
      ctx.fillStyle = "#ef4444";
      ctx.textAlign = "center";
      ctx.fillText("Note: No White Card responses detected in this dataset", width / 2, height - 160);
    }
  }
}








router.post("/result", authenticateToken, async (req, res) => {
  try {
    const { surveyId } = req.body;

    if (!surveyId) {
      return res.status(400).json({ error: "Survey ID is required" });
    }

    // Fetch dataset from the database
    const dataset = await Result.find({ surveyid: surveyId });

    if (dataset.length === 0) {
      return res.status(404).json({ error: "No results found for this survey" });
    }
    const usernames = dataset.map(result => result.user);

    // Get corresponding verified users' details
    const verifiedUsers = await VerifiedUsers.find({
      username: { $in: usernames },
    });

    // Create username-to-details mapping
    const userDetailsMap = {};
    verifiedUsers.forEach(user => {
      // Convert dateOfBirth to age
      const age = user.dateOfBirth ? calculateAge(user.dateOfBirth) : null;

      userDetailsMap[user.username] = {
        gender: user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1).toLowerCase() : 'unknown',
        age: age,
        houseDetails: user.houseDetails || 'unknown',
        wardNumber: user.wardNumber || 'unknown',
        income: user.income || 'unknown',
        occupation: user.occupation || 'unknown',
        rationcardType: user.rationcardType || 'unknown',
      };
    });

    // Embed user details into the dataset
    const datasetWithUserDetails = dataset.map(result => ({
      ...result.toObject(),
      userDetails: userDetailsMap[result.user] || {
        gender: 'unknown',
        age: null,
        houseDetails: 'unknown',
        wardNumber: 'unknown',
        income: 'unknown',
        occupation: 'unknown',
        rationcardType: 'unknown',
      },
    }));
    console.log(datasetWithUserDetails);


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
    const maxCount = Math.max(...optionsData.map((d) => d.count));
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
      ctx.fillRect(labelX - countMetrics.width / 2 - 5, labelY - 15, countMetrics.width + 10, 20);

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

    // Prepare dataset for Google AI Studio (Gemini) API
    const datasetForAnalysis = optionsData.map((d) => ({
      question: d._id,
      count: d.count,
    }));
    console.log(datasetForAnalysis)

    try {
      
    
      const prompt = `analyse the dataset in 3 sentance(only main patters) Here's the data: ${JSON.stringify(datasetWithUserDetails, null, 2)}`;
    
      const geminiResponse = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyBUeGDjib_NMhQYe9cr22Z5hpCgVps4l7A",
        {
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    
      // Extract insights from the response
      let insights = "No insights available.";
      if (geminiResponse.data &&
        geminiResponse.data.candidates &&
        geminiResponse.data.candidates.length > 0 &&
        geminiResponse.data.candidates[0].content &&
        geminiResponse.data.candidates[0].content.parts &&
        geminiResponse.data.candidates[0].content.parts.length > 0) {
    
        insights = geminiResponse.data.candidates[0].content.parts[0].text;
      }
      console.log(insights);
    
      // Return response with histogram, dataset, and insights
      res.json({
        results: optionsData.map((d) => ({
          question: d._id,
          answers: [d.count.toString()],
        })),
        image: imageUrl,
        insights: insights,
      });
    } catch (aiError) {
      console.error("Error fetching AI insights:", aiError);
      // Fallback: Return the data and image without AI insights
      res.json({
        results: optionsData.map((d) => ({
          question: d._id,
          answers: [d.count.toString()],
        })),
        image: imageUrl,
        insights: "AI insights are currently unavailable.",
      });
    
    }
  } catch (error) {
    console.error("Error generating histogram or fetching insights:", error);
    res.status(500).json({ error: "Failed to generate histogram or fetch insights" });
  }
});








router.post("/gender", authenticateToken, async (req, res) => {
  try {
    const { surveyId } = req.body;
    console.log("gender analysis started");

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
      username: { $in: usernames },
    });

    // Create username-to-gender mapping
    const genderMap = {};
    verifiedUsers.forEach(user => {
      // Standardize gender to capitalized format
      genderMap[user.username] = user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1).toLowerCase() : 'unknown';
    });

    // Create final dataset with option and gender
    const genderData = dataset.map(result => ({
      option: result.option,
      gender: genderMap[result.user] || 'unknown',
    }));
    console.log(genderData);

    // Filter out 'unknown' genders
    const filteredData = genderData.filter(data => data.gender !== 'unknown');

    // Standardize genders to Male/Female format (handle case variations)
    const standardizedData = filteredData.map(item => ({
      option: item.option,
      gender: item.gender.toLowerCase() === 'male' ? 'Male' : 
              item.gender.toLowerCase() === 'female' ? 'Female' : item.gender
    }));
    
    console.log("Standardized data:", standardizedData);

    // Count the occurrences of each option by gender
    const optionGenderCounts = {};
    standardizedData.forEach(data => {
      if (!optionGenderCounts[data.option]) {
        optionGenderCounts[data.option] = { Male: 0, Female: 0 };
      }
      if (data.gender === 'Male' || data.gender === 'Female') {
        optionGenderCounts[data.option][data.gender]++;
      }
    });
    
    console.log("Option gender counts:", optionGenderCounts);

    // Prepare data for the bar chart
    const options = Object.keys(optionGenderCounts);
    
    // Create canvas for the bar chart
    const canvas = createCanvas(1200, 800);
    const ctx = canvas.getContext("2d");

    // Enhanced visualization
    createEnhancedBarChart(ctx, canvas, options, optionGenderCounts, "gender");

    // Convert canvas to Base64 image
    const imageUrl = canvas.toDataURL("image/png");

    res.status(200).json({
      genderData: standardizedData,
      image: imageUrl,
    });

  } catch (error) {
    console.error("Error fetching gender data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});














router.post("/age", authenticateToken, async (req, res) => {
  try {
    const { surveyId } = req.body;
    console.log("age analysis started");

    if (!surveyId) {
      return res.status(400).json({ error: "Survey ID is required" });
    }

    const dataset = await Result.find({ surveyid: surveyId });

    if (dataset.length === 0) {
      return res.status(404).json({ error: "No results found for this survey" });
    }

    // Extract all unique usernames from results
    const usernames = dataset.map(result => result.user);

    // Get corresponding verified users with dateOfBirth
    const verifiedUsers = await VerifiedUsers.find({
      username: { $in: usernames },
    });
    console.log(usernames)

    // Create username-to-age mapping
    const ageMap = {};
    verifiedUsers.forEach(user => {
      if (user.dateOfBirth) {
        // Calculate age based on date of birth
        const dob = new Date(user.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        
        // Adjust age if birthday hasn't occurred yet this year
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        
        ageMap[user.username] = age;
      }
    });

    // Create final dataset with option and age
    const ageData = dataset.map(result => ({
      option: result.option,
      age: ageMap[result.user] || null,
    }));

    // Filter out null ages
    const filteredData = ageData.filter(data => data.age !== null);
    console.log("Age data:", ageData);

    // Group ages by option
    const agesByOption = {};
    filteredData.forEach(data => {
      if (!agesByOption[data.option]) {
        agesByOption[data.option] = [];
      }
      agesByOption[data.option].push(data.age);
    });
    
    console.log("Ages by option:", agesByOption);

    // Calculate age statistics for each option
    const ageStats = {};
    Object.keys(agesByOption).forEach(option => {
      const ages = agesByOption[option];
      ageStats[option] = {
        count: ages.length,
        min: Math.min(...ages),
        max: Math.max(...ages),
        mean: ages.reduce((sum, age) => sum + age, 0) / ages.length,
        median: calculateMedian(ages)
      };
    });
    
    console.log("Age statistics:", ageStats);

    // Create canvas for the strip plot
    const canvas = createCanvas(1200, 800);
    const ctx = canvas.getContext("2d");

    // Create strip plot visualization
    createAgeStripPlot(ctx, canvas, agesByOption, ageStats);

    // Convert canvas to Base64 image
    const imageUrl = canvas.toDataURL("image/png");

    res.status(200).json({
      ageData: filteredData,
      ageStats: ageStats,
      image: imageUrl,
    });

  } catch (error) {
    console.error("Error fetching age data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper function to calculate median
function calculateMedian(values) {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  
  return sorted[middle];
}

// Function to create a strip plot visualization for age distribution
function createAgeStripPlot(ctx, canvas, agesByOption) {
  // Canvas dimensions and margins
  const width = canvas.width;
  const height = canvas.height;
  const margin = { top: 80, right: 120, bottom: 120, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Background with gradient
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, "#f9fafb");
  bgGradient.addColorStop(1, "#f3f4f6");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw border and shadow effect
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Add title with shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.font = "bold 32px Arial, sans-serif";
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.fillText("Age Distribution by Response Option", width / 2, margin.top / 2 + 10);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Get all options
  const options = Object.keys(agesByOption);

  // Set global min and max age for scaling
  const globalMinAge = 0;
  const globalMaxAge = 70;

  // Y and X scales
  const yScale = value => height - margin.bottom - ((value - globalMinAge) / (globalMaxAge - globalMinAge)) * chartHeight;
  const xScale = index => margin.left + (index * (chartWidth / options.length)) + (chartWidth / options.length / 2);

  // Draw axes
  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 2;

  // Y-axis (Age)
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, height - margin.bottom);
  ctx.stroke();

  // X-axis (Options)
  ctx.beginPath();
  ctx.moveTo(margin.left, height - margin.bottom);
  ctx.lineTo(margin.left + chartWidth, height - margin.bottom);
  ctx.stroke();

  // Draw Y-axis ticks and labels
  const tickCount = 7; // 0 to 70 in steps of 10
  const tickStep = (globalMaxAge - globalMinAge) / tickCount;

  for (let i = 0; i <= tickCount; i++) {
    const tickValue = globalMinAge + (i * tickStep);
    const y = yScale(tickValue);

    // Draw tick
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left - 10, y);
    ctx.strokeStyle = "#374151";
    ctx.stroke();

    // Draw tick label
    ctx.font = "14px Arial, sans-serif";
    ctx.fillStyle = "#4b5563";
    ctx.textAlign = "right";
    ctx.fillText(Math.round(tickValue), margin.left - 15, y + 5);
  }

  // Color palette for different options
  const colors = [
    "#3b82f6", // Blue
    "#ec4899", // Pink
    "#10b981", // Green
    "#f59e0b", // Amber
    "#8b5cf6", // Purple
    "#ef4444", // Red
  ];

  // Draw horizontal dashed lines for each option
  options.forEach((option, index) => {
    const x = xScale(index);

    // Draw option label
    ctx.font = "bold 16px Arial, sans-serif";
    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.fillText(option, x, height - margin.bottom + 40);

    // Draw count
    ctx.font = "14px Arial, sans-serif";
    ctx.fillStyle = "#4b5563";
    ctx.fillText(`(n=${agesByOption[option].length})`, x, height - margin.bottom + 60);
  });

  // Function to add jitter to avoid overlapping points
  const jitter = () => (Math.random() - 0.5) * (chartWidth / options.length * 0.7);

  // Draw data points for each option
  options.forEach((option, index) => {
    const ages = agesByOption[option];
    const color = colors[index % colors.length];

    // Draw strip plot points
    ages.forEach(age => {
      const x = xScale(index) + jitter();
      const y = yScale(age);

      // Draw point with gradient
      const pointGradient = ctx.createRadialGradient(x, y, 0, x, y, 6);
      pointGradient.addColorStop(0, color);
      pointGradient.addColorStop(1, color + "80"); // Add transparency

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = pointGradient;
      ctx.fill();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = color;
      ctx.stroke();
    });
  });

  // Draw Y-axis title
  ctx.save();
  ctx.translate(25, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "bold 18px Arial, sans-serif";
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.fillText("Age (years)", 0, 0);
  ctx.restore();

  // Draw X-axis title
  ctx.font = "bold 18px Arial, sans-serif";
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.fillText("Response Options", width / 2, height - 30);

  // Add a note about the visualization
  ctx.font = "italic 14px Arial, sans-serif";
  ctx.fillStyle = "#4b5563";
  ctx.textAlign = "center";
  ctx.fillText("* Each dot represents one response", width / 2, height - 60);

  // Add total responses count
  let totalResponses = 0;
  Object.values(agesByOption).forEach(ages => {
    totalResponses += ages.length;
  });

  ctx.font = "italic 14px Arial, sans-serif";
  ctx.fillStyle = "#4b5563";
  ctx.textAlign = "center";
  ctx.fillText(`Total responses with age data: ${totalResponses}`, width / 2, height - 80);
}

// Helper function to draw rounded rectangles (reusing from the gender visualization)






router.post("/rationcard", authenticateToken, async (req, res) => {
  try {
    const { surveyId } = req.body;
    console.log("Ration Card analysis started");

    if (!surveyId) {
      return res.status(400).json({ error: "Survey ID is required" });
    }

    const dataset = await Result.find({ surveyid: surveyId });

    if (dataset.length === 0) {
      return res.status(404).json({ error: "No results found for this survey" });
    }

    // Extract all unique usernames from results
    const usernames = dataset.map(result => result.user);

    // Get corresponding verified users' ration card types
    const verifiedUsers = await VerifiedUsers.find({
      username: { $in: usernames },
    });

    // Create username-to-ration card mapping
    const rationcardMap = {};
    verifiedUsers.forEach(user => {
      // Standardize ration card type to capitalized format
      rationcardMap[user.username] = user.rationcardType ? user.rationcardType.charAt(0).toUpperCase() + user.rationcardType.slice(1).toLowerCase() : 'unknown';
    });

    // Create final dataset with option and ration card type
    const rationCardData = dataset.map(result => ({
      option: result.option,
      rationcardType: rationcardMap[result.user] || 'unknown',
    }));
    console.log(rationCardData);

    // Filter out 'unknown' ration card types
    const filteredData = rationCardData.filter(data => data.rationcardType !== 'unknown');

    // Standardize ration card types to Yellow/Pink/Blue/White format
    const standardizedData = filteredData.map(item => ({
      option: item.option,
      rationcardType: item.rationcardType.toLowerCase() === 'yellow' ? 'Yellow' : 
                      item.rationcardType.toLowerCase() === 'pink' ? 'Pink' : 
                      item.rationcardType.toLowerCase() === 'blue' ? 'Blue' : 
                      item.rationcardType.toLowerCase() === 'white' ? 'White' : item.rationcardType
    }));
    
    console.log("Standardized data:", standardizedData);

    // Count the occurrences of each option by ration card type
    const optionRationCardCounts = {};
    standardizedData.forEach(data => {
      if (!optionRationCardCounts[data.option]) {
        optionRationCardCounts[data.option] = { Yellow: 0, Pink: 0, Blue: 0, White: 0 };
      }
      if (data.rationcardType === 'Yellow' || data.rationcardType === 'Pink' || data.rationcardType === 'Blue' || data.rationcardType === 'White') {
        optionRationCardCounts[data.option][data.rationcardType]++;
      }
    });
    
    console.log("Option ration card counts:", optionRationCardCounts);

    // Prepare data for the bar chart
    const options = Object.keys(optionRationCardCounts);
    
    // Create canvas for the bar chart
    const canvas = createCanvas(1200, 800);
    const ctx = canvas.getContext("2d");

    // Enhanced visualization
    createEnhancedBarChart(ctx, canvas, options, optionRationCardCounts, "rationcard");

    // Convert canvas to Base64 image
    const imageUrl = canvas.toDataURL("image/png");

    res.status(200).json({
      rationCardData: standardizedData,
      image: imageUrl,
    });

  } catch (error) {
    console.error("Error fetching ration card data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});





router.post("/ward", authenticateToken, async (req, res) => {
  try {
    const { surveyId } = req.body;
    console.log("Ward analysis started");

    if (!surveyId) {
      return res.status(400).json({ error: "Survey ID is required" });
    }

    const dataset = await Result.find({ surveyid: surveyId });

    if (dataset.length === 0) {
      return res.status(404).json({ error: "No results found for this survey" });
    }

    // Extract all unique usernames from results
    const usernames = dataset.map(result => result.user);

    // Get corresponding verified users' ward numbers
    const verifiedUsers = await VerifiedUsers.find({
      username: { $in: usernames },
    });

    // Create username-to-ward mapping
    const wardMap = {};
    verifiedUsers.forEach(user => {
      wardMap[user.username] = user.wardNumber || 'unknown';
    });

    // Create final dataset with option and ward number
    const wardData = dataset.map(result => ({
      option: result.option,
      wardNumber: wardMap[result.user] || 'unknown',
    }));
    console.log(wardData);

    // Filter out 'unknown' ward numbers
    const filteredData = wardData.filter(data => data.wardNumber !== 'unknown');

    // Standardize ward numbers to integers (1 to 15)
    const standardizedData = filteredData.map(item => ({
      option: item.option,
      wardNumber: parseInt(item.wardNumber), // Convert to integer
    })).filter(item => item.wardNumber >= 1 && item.wardNumber <= 15); // Ensure ward numbers are between 1 and 15

    console.log("Standardized data:", standardizedData);

    // Get all unique options
    const options = [...new Set(standardizedData.map(item => item.option))];
    const wards = Array.from({ length: 15 }, (_, i) => i + 1); // Wards 1 to 15

    // Count the occurrences of each option by ward number
    const optionWardCounts = {};
    options.forEach(option => {
      optionWardCounts[option] = Array(15).fill(0); // Initialize array for 15 wards
    });

    standardizedData.forEach(data => {
      if (data.wardNumber >= 1 && data.wardNumber <= 15) {
        optionWardCounts[data.option][data.wardNumber - 1]++; // Increment count for the ward
      }
    });

    console.log("Option ward counts:", optionWardCounts);

    // Create canvas for the heatmap
    const canvas = createCanvas(1200, 800);
    const ctx = canvas.getContext("2d");

    // Enhanced heatmap visualization
    createWardHeatmap(ctx, canvas, options, wards, optionWardCounts);

    // Convert canvas to Base64 image
    const imageUrl = canvas.toDataURL("image/png");

    res.status(200).json({
      wardData: standardizedData,
      image: imageUrl,
    });

  } catch (error) {
    console.error("Error fetching ward data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Function to create a heatmap visualization for ward distribution
function createWardHeatmap(ctx, canvas, options, wards, optionWardCounts) {
  // Canvas dimensions and margins
  const width = canvas.width;
  const height = canvas.height;
  const margin = { top: 80, right: 120, bottom: 120, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Background with gradient
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, "#f9fafb");
  bgGradient.addColorStop(1, "#f3f4f6");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw border and shadow effect
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Add title with shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.font = "bold 32px Arial, sans-serif";
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.fillText("Ward Distribution by Response Option", width / 2, margin.top / 2 + 10);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Calculate cell dimensions
  const cellWidth = chartWidth / wards.length;
  const cellHeight = chartHeight / options.length;

  // Color scale for heatmap
  const colorScale = (value, max) => {
    const intensity = Math.min(value / max, 1); // Normalize value between 0 and 1
    const red = Math.floor(255 * intensity);
    const green = Math.floor(255 * (1 - intensity));
    const blue = 0;
    return `rgb(${red}, ${green}, ${blue})`;
  };

  // Find the maximum count for scaling
  const maxCount = Math.max(...options.map(option => Math.max(...optionWardCounts[option])));

  // Draw heatmap cells
  options.forEach((option, i) => {
    wards.forEach((ward, j) => {
      const count = optionWardCounts[option][ward - 1] || 0;
      const color = colorScale(count, maxCount);

      // Draw cell
      ctx.fillStyle = color;
      ctx.fillRect(
        margin.left + j * cellWidth,
        margin.top + i * cellHeight,
        cellWidth,
        cellHeight
      );

      // Draw cell border
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        margin.left + j * cellWidth,
        margin.top + i * cellHeight,
        cellWidth,
        cellHeight
      );

      // Add count label if space allows
      if (cellWidth > 30 && cellHeight > 30) {
        ctx.font = "bold 14px Arial, sans-serif";
        ctx.fillStyle = count > maxCount / 2 ? "#ffffff" : "#000000"; // Dynamic text color for contrast
        ctx.textAlign = "center";
        ctx.fillText(
          count.toString(),
          margin.left + j * cellWidth + cellWidth / 2,
          margin.top + i * cellHeight + cellHeight / 2 + 6
        );
      }
    });
  });

  // Draw X-axis labels (wards)
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  wards.forEach((ward, j) => {
    ctx.fillText(
      `Ward ${ward}`,
      margin.left + j * cellWidth + cellWidth / 2,
      height - margin.bottom + 30
    );
  });

  // Draw Y-axis labels (options)
  options.forEach((option, i) => {
    ctx.font = "bold 16px Arial, sans-serif";
    ctx.fillStyle = "#111827";
    ctx.textAlign = "right";
    ctx.fillText(
      option,
      margin.left - 10,
      margin.top + i * cellHeight + cellHeight / 2 + 6
    );
  });

  // Add a legend for the heatmap
  const legendX = width - margin.right + 20;
  const legendY = margin.top;
  const legendWidth = 30;
  const legendHeight = 200;

  // Draw legend gradient
  const legendGradient = ctx.createLinearGradient(0, legendY, 0, legendY + legendHeight);
  legendGradient.addColorStop(0, colorScale(maxCount, maxCount));
  legendGradient.addColorStop(1, colorScale(0, maxCount));
  ctx.fillStyle = legendGradient;
  ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

  // Draw legend labels
  ctx.font = "14px Arial, sans-serif";
  ctx.fillStyle = "#111827";
  ctx.textAlign = "left";
  ctx.fillText(maxCount.toString(), legendX + legendWidth + 10, legendY + 10);
  ctx.fillText("0", legendX + legendWidth + 10, legendY + legendHeight - 10);

  // Add a note about the visualization
  ctx.font = "italic 14px Arial, sans-serif";
  ctx.fillStyle = "#4b5563";
  ctx.textAlign = "center";
  ctx.fillText("* Color intensity represents the number of responses", width / 2, height - 60);

  // Add total responses count
  const totalResponses = Object.values(optionWardCounts).reduce((sum, counts) => sum + counts.reduce((a, b) => a + b, 0), 0);
  ctx.font = "italic 14px Arial, sans-serif";
  ctx.fillStyle = "#4b5563";
  ctx.textAlign = "center";
  ctx.fillText(`Total responses with ward data: ${totalResponses}`, width / 2, height - 80);
}


export default router;