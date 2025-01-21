import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import userRoute from './Routes/userRoute.js';
import governmentRoute from './Routes/governmentRoute.js'
import departmentRoute from './Routes/departmentRoute.js'


dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Set limit to 10MB for request body

// Routes
app.get("/", (req, res) => res.send("Hello Nishana"));

// Register routes

app.use('/user', userRoute);
app.use('/government', governmentRoute);
app.use('/department', departmentRoute);


// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("MongoDB connected");
    // Start the server after successful database connection
    app.listen(4000, () => {
        console.log("Server started");
    });
}).catch(err => {
    console.error("Error connecting to MongoDB:", err);
    // Exit the process if unable to connect to MongoDB
    process.exit(1);
});
