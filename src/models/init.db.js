// src/models/init.db.js
const pool = require('../config/db.config');

const createTables = async () => {
  const userTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`;
  
  const scoreTableQuery = `
  CREATE TABLE IF NOT EXISTS scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    game_type VARCHAR(50) DEFAULT 'doom', -- Để sau này hỗ trợ Caro/Sudoku
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`;

  try {
    await pool.query(userTableQuery);
    console.log("Bảng 'users' đã sẵn sàng.");
    
    await pool.query(scoreTableQuery);
    console.log("Bảng 'scores' đã sẵn sàng.");
  } catch (err) {
    console.error("Lỗi khi tạo bảng:", err);
    throw err;
  }
};

module.exports = createTables;