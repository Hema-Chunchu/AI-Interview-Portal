const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Session",
        required: true
    },

    text: {
        type: String,
        required: true
    },

    transcript: {
        type: String,
        default: ""
    },

    feedback: {
        type: String,
        default: ""
    },

    recordingUrl: {
        type: String,
        default: ""
    }
});

module.exports = mongoose.model("Question", questionSchema);