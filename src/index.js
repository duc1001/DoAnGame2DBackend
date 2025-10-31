// src/index.js (CẬP NHẬT)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db.config'); 
const createTables = require('./models/init.db'); 

// --- CẬP NHẬT: Thêm http và socket.io ---
const http = require('http'); // MỚI
const { Server } = require("socket.io"); // MỚI
// ------------------------------------------

// Import các routes
const authRoutes = require('./api/auth.routes');
const scoreRoutes = require('./api/score.routes');

const PORT = process.env.PORT || 3001;
const app = express();

// --- CẬP NHẬT: Khởi tạo server HTTP và Socket.IO ---
const server = http.createServer(app); // MỚI
const io = new Server(server, { // MỚI
  cors: {
    origin: "*", // Cho phép mọi client kết nối (có thể giới hạn sau)
    methods: ["GET", "POST"]
  }
});
// ----------------------------------------------------

// Middlewares
app.use(cors());
app.use(express.json());

// === Kết nối DB và Tạo bảng ===
const initializeDatabase = async () => {
  // ... (Giữ nguyên code của bạn)
};

// === Sử dụng Routes ===
app.use('/api/auth', authRoutes);
app.use('/api/score', scoreRoutes);

// Route cơ bản
app.get('/', (req, res) => {
  res.send('Game Backend Sẵn Sàng (API + WebSocket)!');
});

// === MỚI: Gọi logic xử lý Socket ===
require('./services/socket.service')(io, pool);
// ----------------------------------

// === CẬP NHẬT: Khởi chạy "server" thay vì "app" ===
initializeDatabase().then(() => {
  server.listen(PORT, () => { // THAY ĐỔI TỪ app.listen
    console.log(`Server đang chạy tại cổng ${PORT}`);
  });
});