const express = require("express");
const { registerUser, loginUser, socialLogin, getMe } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// @route   POST /api/auth/register or /api/register
// @desc    Register a new user
// @access  Public
router.post("/register", registerUser);

// @route   POST /api/auth/login or /api/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", loginUser);

// @route   POST /api/auth/social or /api/social
// @desc    Authenticate or register user via social provider
// @access  Public
router.post("/social", socialLogin);

// @route   GET /api/auth/me or /api/me
// @desc    Get current user profile
// @access  Private
router.get("/me", authMiddleware, getMe);

module.exports = router;