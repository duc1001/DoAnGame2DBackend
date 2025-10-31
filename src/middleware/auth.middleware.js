// src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Lấy token từ header: "Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Không tìm thấy token xác thực" });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Giải mã token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Gắn thông tin user (đã giải mã) vào request
    req.user = decoded; // { id: ..., username: ... }
    
    // Đi tiếp
    next(); 
  } catch (err) {
    res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

module.exports = authMiddleware;