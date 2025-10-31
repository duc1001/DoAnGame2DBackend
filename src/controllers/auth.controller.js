// src/controllers/auth.controller.js
const pool = require('../config/db.config');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Đăng ký
exports.register = async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: "Thiếu username hoặc password" });
  }

  try {
    // 1. Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    // 2. Lưu vào DB
    const newUser = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [username, password_hash]
    );
    
    res.status(201).json({
      message: "Đăng ký thành công!",
      user: newUser.rows[0]
    });

  } catch (err) {
    if (err.code === '23505') { // Lỗi 'unique_violation' (username đã tồn tại)
      return res.status(409).json({ message: "Username này đã tồn tại" });
    }
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// Đăng nhập
exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Thiếu username hoặc password" });
  }

  try {
    // 1. Tìm user
    const userResult = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: "Username hoặc mật khẩu không đúng" });
    }
    const user = userResult.rows[0];
    
    // 2. So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Username hoặc mật khẩu không đúng" });
    }
    
    // 3. Tạo Token (JWT)
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // Token hết hạn sau 1 ngày
    );
    
    res.status(200).json({
      message: "Đăng nhập thành công",
      token: token,
      user: { id: user.id, username: user.username }
    });

  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};