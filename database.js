// database.js — connects Node.js to MySQL
// This is the bridge between your server and your database

const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

// Create a connection pool
// A pool manages multiple connections efficiently
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 10,
});

// Export as promise-based so we can use async/await
module.exports = pool.promise();