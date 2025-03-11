import express from 'express';
const router = express.Router();
import Result from '../Models/Result.js';
import { createCanvas } from 'canvas';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import VerifiedUsers from '../Models/verUsers.js';
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

    // Prepare data for the mosaic plot
    const options = Object.keys(optionGenderCounts);
    
    // Create canvas for the mosaic plot
    const canvas = createCanvas(1200, 800);
    const ctx = canvas.getContext("2d");

    // Enhanced visualization
    createEnhancedMosaicPlot(ctx, canvas, options, optionGenderCounts);

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

// Enhanced visualization function
function createEnhancedMosaicPlot(ctx, canvas, options, optionGenderCounts) {
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
  ctx.fillText("Gender Distribution by Response Option", width / 2, margin.top / 2 + 10);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Calculate total counts for each option
  const totalCounts = options.map(option => 
    optionGenderCounts[option].Male + optionGenderCounts[option].Female
  );
  const totalResponses = totalCounts.reduce((sum, count) => sum + count, 0);
  
  // Calculate bar widths based on total counts (proportional)
  const barWidths = totalCounts.map(count => (count / totalResponses) * chartWidth);
  
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
  
  // Modern color palette for gender categories
  const colors = {
    Male: {
      gradient: ["#3b82f6", "#1d4ed8"],  // Blue gradient
      border: "#1e40af"
    },
    Female: {
      gradient: ["#ec4899", "#be185d"],  // Pink gradient
      border: "#9d174d"
    }
  };
  
  // Draw mosaic bars with enhanced styling
  let x = margin.left;
  options.forEach((option, index) => {
    const barWidth = barWidths[index];
    const totalCount = totalCounts[index];
    
    const maleCount = optionGenderCounts[option].Male;
    const femaleCount = optionGenderCounts[option].Female;
    
    const maleRatio = maleCount / totalCount;
    const femaleRatio = femaleCount / totalCount;
    
    const maleHeight = maleRatio * chartHeight;
    const femaleHeight = femaleRatio * chartHeight;
    
    // Calculate percentage for labels
    const malePercentage = Math.round(maleRatio * 100);
    const femalePercentage = Math.round(femaleRatio * 100);
    
    // Draw Female segment (from top)
    const femaleGradient = ctx.createLinearGradient(
      x, margin.top, 
      x + barWidth, margin.top + femaleHeight
    );
    femaleGradient.addColorStop(0, colors.Female.gradient[0]);
    femaleGradient.addColorStop(1, colors.Female.gradient[1]);
    
    ctx.fillStyle = femaleGradient;
    ctx.beginPath();
    ctx.rect(x, margin.top, barWidth, femaleHeight);
    ctx.fill();
    
    ctx.strokeStyle = colors.Female.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Draw Male segment (below female)
    const maleGradient = ctx.createLinearGradient(
      x, margin.top + femaleHeight, 
      x + barWidth, margin.top + femaleHeight + maleHeight
    );
    maleGradient.addColorStop(0, colors.Male.gradient[0]);
    maleGradient.addColorStop(1, colors.Male.gradient[1]);
    
    ctx.fillStyle = maleGradient;
    ctx.beginPath();
    ctx.rect(x, margin.top + femaleHeight, barWidth, maleHeight);
    ctx.fill();
    
    ctx.strokeStyle = colors.Male.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Add labels for each segment if enough space
    if (barWidth > 50) {
      // Female percentage label (only if female segment exists)
      if (femaleHeight > 30 && femaleCount > 0) {
        ctx.font = "bold 16px Arial, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(
          `${femalePercentage}%`, 
          x + barWidth / 2, 
          margin.top + femaleHeight / 2 + 6
        );
        
        if (femaleHeight > 60) {
          ctx.font = "14px Arial, sans-serif";
          ctx.fillText(
            `(${femaleCount})`, 
            x + barWidth / 2, 
            margin.top + femaleHeight / 2 + 28
          );
        }
      }
      
      // Male percentage label (only if male segment exists)
      if (maleHeight > 30 && maleCount > 0) {
        ctx.font = "bold 16px Arial, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(
          `${malePercentage}%`, 
          x + barWidth / 2, 
          margin.top + femaleHeight + maleHeight / 2 + 6
        );
        
        if (maleHeight > 60) {
          ctx.font = "14px Arial, sans-serif";
          ctx.fillText(
            `(${maleCount})`, 
            x + barWidth / 2, 
            margin.top + femaleHeight + maleHeight / 2 + 28
          );
        }
      }
    }
    
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
    ctx.fillText(`(n=${totalCount})`, 0, 24);
    
    ctx.restore();
    
    // Move to the next bar
    x += barWidth;
  });
  
  // Draw Y-axis title with rotation
  ctx.save();
  ctx.translate(25, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "bold 18px Arial, sans-serif";
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.fillText("Gender Proportion", 0, 0);
  ctx.restore();
  
  // Draw X-axis title
  ctx.font = "bold 18px Arial, sans-serif";
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.fillText("Response Options", width / 2, height - 30);
  
  // Create an enhanced legend
  const legendX = width - margin.right + 20;
  const legendY = margin.top;
  const legendWidth = 90;
  const legendHeight = 130;
  
  // Legend background
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 1;
  roundRect(ctx, legendX - 10, legendY, legendWidth, legendHeight, 8, true, true);
  
  // Legend title
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.fillStyle = "#111827";
  ctx.textAlign = "left";
  ctx.fillText("Gender", legendX, legendY + 25);
  
  // Legend items
  const legendItems = [
    { label: "Female", color: colors.Female.gradient[0], y: legendY + 55 },
    { label: "Male", color: colors.Male.gradient[0], y: legendY + 90 }
  ];
  
  legendItems.forEach(item => {
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
  ctx.fillText("* Width of each bar represents proportion of total responses", width / 2, height - 60);
  
  // Add dataset information
  ctx.font = "italic 14px Arial, sans-serif";
  ctx.fillStyle = "#4b5563";
  ctx.textAlign = "center";
  ctx.fillText(`Total responses: ${totalResponses}`, width / 2, height - 80);
  
  // Draw a border around the chart area
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.strokeRect(margin.left, margin.top, chartWidth, chartHeight);
  
  // If there are no female responses, add a note
  if (!options.some(option => optionGenderCounts[option].Female > 0)) {
    ctx.font = "bold 16px Arial, sans-serif";
    ctx.fillStyle = "#ef4444";
    ctx.textAlign = "center";
    ctx.fillText("Note: No female responses detected in this dataset", width / 2, height - 100);
  }
}

// Helper function to draw rounded rectangles




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







export default router;