const mongoose = require("mongoose");
const dns = require("dns");

// Configure public DNS to resolve MongoDB Atlas SRV records on routers/ISPs that fail SRV queries
try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (dnsErr) {
    console.warn("Could not set custom DNS servers:", dnsErr.message);
}

const connectDB = async () => {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        console.warn("⚠️ No MONGO_URI provided in server/.env");
        return;
    }

    try {
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 8000
        });
        console.log("✅ MongoDB connected successfully to Atlas!");
    } catch (error) {
        console.warn("⚠️ MongoDB connection failed:", error.message);
        console.log("ℹ️ Server running in direct in-memory fallback mode.");
    }
};

module.exports = connectDB;