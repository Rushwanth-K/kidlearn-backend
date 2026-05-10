// server.js — this is the starting point of your backend
// Just like main.dart is the starting point of Flutter

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();

// Middleware — these run on every request
app.use(cors());              // allows Flutter to call this server
app.use(express.json());      // allows reading JSON data from requests

// Routes — these handle different URL paths
const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const childrenRoutes = require('./routes/children');

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/children', childrenRoutes);

// Test route — to check if server is running
app.get('/', (req, res) => {
  res.json({ message: 'KidLearn backend is running!' });
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
process.on('uncaughtException', (err) => {
  console.error('Error:', err.message);
});