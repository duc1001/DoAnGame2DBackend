// src/config/db.config.js
const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("Biến môi trường DATABASE_URL chưa được thiết lập.");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  // Bật SSL khi deploy lên Production (Railway)
  // Tắt SSL khi chạy Local (development)
  ssl: process.env.NODE_ENV === "production" 
    ? { rejectUnauthorized: false } 
    : false
});

module.exports = pool;