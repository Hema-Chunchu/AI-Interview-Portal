const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getMe } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

// @route   POST /api/auth/register
// @access  Public
router.post("/register", registerUser);

// @route   POST /api/auth/login
// @access  Public
router.post("/login", loginUser);

// @route   GET /api/auth/me
// @access  Private
router.get("/me", authMiddleware, getMe);

module.exports = router;
