import express, { json } from 'express';
import mongoose from 'mongoose';
import dbConfig from './config/db.js';
import hodRoutes from './routes/hodRoutes.js';
import lecturerRouter from './routes/lecturerRoutes.js';
import hodRouter from './routes/hodRoutes.js';
import studentRouter from './routes/studentRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware

app.use(json());

// Routes
app.use('/api/hod', hodRouter);
app.use('/api/lecturers', lecturerRouter);
app.use('/api/students', studentRouter);

// Start the server
app.listen(PORT, async () => {
    // Database connection
    await dbConfig();
    console.log(`Server is running on port ${PORT}`);
});