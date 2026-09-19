const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    role: {
        type: String,
        required: true
    },

    score: {
        type: Number,
        default: 0
    },

    summary: {
        type: String,
        default: ""
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Session", sessionSchema);