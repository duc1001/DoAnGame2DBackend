// src/api/score.routes.js
const express = require('express');
const router = express.Router();
const scoreController = require('../controllers/score.controller');
const authMiddleware = require('../middleware/auth.middleware');

// GET /api/score/leaderboard (Công khai)
router.get('/leaderboard', scoreController.getLeaderboard);

// POST /api/score/submit (Bảo vệ - Phải đăng nhập)
router.post('/submit', authMiddleware, scoreController.submitScore);

module.exports = router;