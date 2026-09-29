const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    college: {
        type: String,
        default: ""
    },

    targetRole: {
        type: String,
        default: "Full Stack"
    },

    authProvider: {
        type: String,
        enum: ["email", "google", "linkedin"],
        default: "email"
    },

    interview: {
        level: {
            type: String,
            enum: ["Junior", "Mid Level", "Senior"],
            default: "Mid Level"
        },
        questionCount: {
            type: Number,
            enum: [3, 4, 6],
            default: 4
        },
        timeLimitMin: {
            type: Number,
            enum: [15, 30, 45],
            default: 30
        },
        topics: {
            type: [String],
            default: ["React", "Node.js"]
        },
        voice: {
            type: Boolean,
            default: true
        },
        instantFeedback: {
            type: Boolean,
            default: true
        },
        saveRecordings: {
            type: Boolean,
            default: true
        }
    },

    notifications: {
        reportReady: {
            type: Boolean,
            default: true
        },
        weeklySummary: {
            type: Boolean,
            default: true
        },
        practiceReminders: {
            type: Boolean,
            default: true
        },
        productUpdates: {
            type: Boolean,
            default: false
        }
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("User", userSchema);