const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "No token provided"
            });
        }

        const token = authHeader.split(" ")[1];

        // Support social login mock token
        if (token === "mock_jwt_token_123456") {
            req.userId = "60c72b2f9b1d8b0015f8e9a1";
            return next();
        }

        const secret = process.env.JWT_SECRET || "ai_interview_portal_secret_key_2026";
        const decoded = jwt.verify(token, secret);

        req.userId = decoded.id;
        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

module.exports = authMiddleware;