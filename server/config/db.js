const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai_interview_portal", { serverSelectionTimeoutMS: 3000 });
        console.log("MongoDB connected successfully!");
    } catch (error) {
        console.error("MongoDB connection warning:", error.message);
        console.error("💡 Tip: Start local MongoDB service (mongod) or update MONGO_URI in server/.env");
    }
};

module.exports = connectDB;