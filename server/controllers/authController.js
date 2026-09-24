const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// Helper function to check DB connection
const isDbConnected = async (res) => {
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (mongoose.connection.readyState === 2) {
        for (let i = 0; i < 15; i++) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            if (mongoose.connection.readyState === 1) break;
        }
    }

    if (mongoose.connection.readyState === 0) {
        res.status(503).json({
            message: "Database connection is offline. Please ensure MONGO_URI is configured correctly in server/.env"
        });
        return false;
    }
    return true;
};

// Helper function to generate JWT token
const generateToken = (userId) => {
    const secret = process.env.JWT_SECRET || "fallback_jwt_secret_key_12345";
    return jwt.sign({ id: userId }, secret, {
        expiresIn: "7d"
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // 1. Validation: Field presence
        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({
                message: "Please fill in all required fields."
            });
        }

        // 2. Validation: Email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({
                message: "Please provide a valid email address."
            });
        }

        // 3. Validation: Password length
        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long."
            });
        }

        // 4. Validation: Password match
        if (password !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match."
            });
        }

        // 5. DB Connectivity Check
        if (!(await isDbConnected(res))) return;

        const normalizedEmail = email.toLowerCase().trim();

        // 6. Check if user already exists
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({
                message: "A user with this email already exists."
            });
        }

        // 7. Hash password securely
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 8. Create user in database
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword
        });

        // 9. Generate token
        const token = generateToken(user._id);

        return res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error("Error in registerUser:", error);
        return res.status(500).json({
            message: error.message || "Server error during registration. Please try again later."
        });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validation: Field presence
        if (!email || !password) {
            return res.status(400).json({
                message: "Please provide email and password."
            });
        }

        // 2. DB Connectivity Check
        if (!(await isDbConnected(res))) return;

        const normalizedEmail = email.toLowerCase().trim();

        // 3. Check if user exists
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password."
            });
        }

        // 4. Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid email or password."
            });
        }

        // 5. Generate token
        const token = generateToken(user._id);

        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error("Error in loginUser:", error);
        return res.status(500).json({
            message: error.message || "Server error during login. Please try again later."
        });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        if (!(await isDbConnected(res))) return;

        const user = await User.findById(req.userId).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        return res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error("Error in getMe:", error);
        return res.status(500).json({
            message: error.message || "Server error fetching user profile."
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe
};
