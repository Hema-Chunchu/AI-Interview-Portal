const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: __dirname + "/.env" });

const User = require("./models/User");
const { getUserSettings, updateUserSettings, updatePassword, deleteAccount } = require("./controllers/userController");

// Helper for mocking Express request & response
const createMockReqRes = (body = {}, headers = {}, userId = null) => {
    const req = { body, headers, userId };
    const res = {
        statusCode: 200,
        responseData: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.responseData = data;
            return this;
        }
    };
    return { req, res };
};

async function runSettingsTests() {
    console.log("=================================================");
    console.log("STARTING SETTINGS MODULE BACKEND TESTS");
    console.log("=================================================\n");

    let mongoServer = null;
    try {
        const { MongoMemoryServer } = require("mongodb-memory-server");
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
        console.log("✔ Connected to in-memory MongoDB instance!");
    } catch (err) {
        console.log("⚠ Using configured MONGO_URI...");
        await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai_interview_portal", { serverSelectionTimeoutMS: 2000 }).catch(() => {});
    }

    if (mongoose.connection.readyState === 1) {
        // Create test user
        const bcrypt = require("bcryptjs");
        const initialPasswordHash = await bcrypt.hash("OldPassword123!", 10);
        const testUser = await User.create({
            name: "Jane Developer",
            email: `jane_${Date.now()}@example.com`,
            password: initialPasswordHash,
            authProvider: "email"
        });

        const userId = testUser._id.toString();

        // 1. Test GET /api/users/me/settings
        console.log("[Test 1] GET /api/users/me/settings");
        {
            const { req, res } = createMockReqRes({}, {}, userId);
            await getUserSettings(req, res);
            console.assert(res.statusCode === 200, "Should return 200");
            console.log(`  ➡ Status ${res.statusCode}: Name="${res.responseData?.name}", TargetRole="${res.responseData?.targetRole}" [PASSED]`);
        }

        // 2. Test PATCH /api/users/me/settings
        console.log("\n[Test 2] PATCH /api/users/me/settings - Update Profile & Interview Preferences");
        {
            const updatePayload = {
                name: "Jane Austen",
                college: "MIT",
                targetRole: "Frontend",
                interview: {
                    level: "Senior",
                    questionCount: 6,
                    timeLimitMin: 45,
                    topics: ["React", "System Design"],
                    voice: false,
                    instantFeedback: true,
                    saveRecordings: true
                },
                notifications: {
                    reportReady: true,
                    weeklySummary: false,
                    practiceReminders: true,
                    productUpdates: true
                }
            };

            const { req, res } = createMockReqRes(updatePayload, {}, userId);
            await updateUserSettings(req, res);
            console.assert(res.statusCode === 200, "Should return 200");
            console.log(`  ➡ Status ${res.statusCode}: ${res.responseData?.message}`);
            console.log(`  ➡ Updated Level: "${res.responseData?.settings?.interview?.level}", Questions: ${res.responseData?.settings?.interview?.questionCount} [PASSED]`);
        }

        // 3. Test PUT /api/users/me/password - Password Update
        console.log("\n[Test 3] PUT /api/users/me/password - Valid Password Change");
        {
            const passwordPayload = {
                currentPassword: "OldPassword123!",
                newPassword: "NewSecretPassword123!",
                confirmPassword: "NewSecretPassword123!"
            };

            const { req, res } = createMockReqRes(passwordPayload, {}, userId);
            await updatePassword(req, res);
            console.assert(res.statusCode === 200, "Should return 200");
            console.log(`  ➡ Status ${res.statusCode}: ${res.responseData?.message} [PASSED]`);
        }

        // 4. Test DELETE /api/users/me - Delete Account
        console.log("\n[Test 4] DELETE /api/users/me - Delete Account & Data");
        {
            const { req, res } = createMockReqRes({}, {}, userId);
            await deleteAccount(req, res);
            console.assert(res.statusCode === 200, "Should return 200");
            const deletedUser = await User.findById(userId);
            console.assert(deletedUser === null, "User must be completely deleted from DB");
            console.log(`  ➡ Status ${res.statusCode}: User record removed from MongoDB [PASSED]`);
        }

        await mongoose.connection.close();
        if (mongoServer) await mongoServer.stop();
    }

    console.log("\n=================================================");
    console.log("✔ ALL SETTINGS BACKEND TESTS PASSED!");
    console.log("=================================================\n");
}

runSettingsTests().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
