require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db.config'); // Import pool
const createTables = require('./models/init.db'); // Import hàm tạo bảng

// Import các routes
const authRoutes = require('./api/auth.routes');
const scoreRoutes = require('./api/score.routes');

const PORT = process.env.PORT || 3000;
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// === Kết nối DB và Tạo bảng ===
const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    console.log("Kết nối database thành công!");
    
    // Chạy hàm tạo bảng
    await createTables();
    
    client.release();
  } catch (err) {
    console.error("LỖI KHỞI TẠO DATABASE:", err);
    process.exit(1); // Thoát nếu không kết nối được DB
  }
};

// === Sử dụng Routes ===
app.use('/api/auth', authRoutes);
app.use('/api/score', scoreRoutes);

// Route cơ bản
app.get('/', (req, res) => {
  res.send('Game Backend Sẵn Sàng!');
});

// Khởi chạy Server sau khi kết nối DB
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`);
  });
});