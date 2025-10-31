// src/controllers/score.controller.js
const pool = require('../config/db.config');

// Lấy 10 điểm cao nhất
exports.getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await pool.query(
      `SELECT u.username, s.score, s.game_type, s.created_at
       FROM scores s
       JOIN users u ON s.user_id = u.id
       ORDER BY s.score DESC
       LIMIT 10`
    );
    res.status(200).json(leaderboard.rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// Gửi điểm mới
exports.submitScore = async (req, res) => {
  const { score, game_type } = req.body;
  const userId = req.user.id; // Lấy từ authMiddleware (sau khi xác thực token)

  if (score === undefined) {
    return res.status(400).json({ message: "Thiếu 'score' (điểm số)" });
  }

  try {
    const newScore = await pool.query(
      "INSERT INTO scores (user_id, score, game_type) VALUES ($1, $2, $3) RETURNING *",
      [userId, score, game_type || 'doom']
    );
    res.status(201).json({
      message: "Lưu điểm thành công!",
      score: newScore.rows[0]
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};