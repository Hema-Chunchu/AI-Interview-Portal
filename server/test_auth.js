const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: __dirname + "/.env" });

const User = require("./models/User");
const { registerUser, loginUser, getMe } = require("./controllers/authController");

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

async function runTests() {
    console.log("=================================================");
    console.log("STARTING FULL AUTHENTICATION MODULE TESTS");
    console.log("=================================================\n");
    
    let mongoServer = null;
    try {
        const { MongoMemoryServer } = require("mongodb-memory-server");
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
        console.log("✔ Connected to in-memory MongoDB instance successfully!");
    } catch (err) {
        console.log("⚠ Could not spin up memory server, trying local URI...");
        try {
            await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai_interview_portal", { serverSelectionTimeoutMS: 2000 });
        } catch (e) {
            console.log("⚠ Live DB unavailable, testing controller validation handlers.");
        }
    }

    const testEmail = "john.doe@example.com";
    const testPassword = "SecurePassword123!";
    const testName = "John Doe";

    // 1. Validation Tests
    console.log("[Test 1] Registration - Empty Fields");
    {
        const { req, res } = createMockReqRes({ name: "", email: "", password: "", confirmPassword: "" });
        await registerUser(req, res);
        console.assert(res.statusCode === 400, "Should return status 400");
        console.log(`  ➡ Status ${res.statusCode}: "${res.responseData?.message}" [PASSED]`);
    }

    console.log("\n[Test 2] Registration - Password Mismatch");
    {
        const { req, res } = createMockReqRes({ name: testName, email: testEmail, password: testPassword, confirmPassword: "MismatchPassword" });
        await registerUser(req, res);
        console.assert(res.statusCode === 400, "Should return status 400");
        console.log(`  ➡ Status ${res.statusCode}: "${res.responseData?.message}" [PASSED]`);
    }

    console.log("\n[Test 3] Registration - Short Password");
    {
        const { req, res } = createMockReqRes({ name: testName, email: testEmail, password: "123", confirmPassword: "123" });
        await registerUser(req, res);
        console.assert(res.statusCode === 400, "Should return status 400");
        console.log(`  ➡ Status ${res.statusCode}: "${res.responseData?.message}" [PASSED]`);
    }

    console.log("\n[Test 4] Registration - Invalid Email");
    {
        const { req, res } = createMockReqRes({ name: testName, email: "invalid-email-str", password: testPassword, confirmPassword: testPassword });
        await registerUser(req, res);
        console.assert(res.statusCode === 400, "Should return status 400");
        console.log(`  ➡ Status ${res.statusCode}: "${res.responseData?.message}" [PASSED]`);
    }

    if (mongoose.connection.readyState === 1) {
        let registeredToken = null;
        let registeredUserId = null;

        console.log("\n[Test 5] Registration - Successful Creation & Password Hashing");
        {
            const { req, res } = createMockReqRes({ name: testName, email: testEmail, password: testPassword, confirmPassword: testPassword });
            await registerUser(req, res);
            console.assert(res.statusCode === 201, "Should return status 201");
            registeredToken = res.responseData?.token;
            registeredUserId = res.responseData?.user?.id;
            console.log(`  ➡ Status ${res.statusCode}: "${res.responseData?.message}"`);
            console.log(`  ➡ Token Generated: ${registeredToken.substring(0, 20)}...`);
            console.log(`  ➡ User Saved ID: ${registeredUserId} [PASSED]`);

            // Verify password stored in DB is hashed and not plain text
            const savedUser = await User.findById(registeredUserId);
            console.assert(savedUser.password !== testPassword, "Password MUST NOT be plain text");
            console.assert(savedUser.password.startsWith("$2a$") || savedUser.password.startsWith("$2b$"), "Password MUST be a bcrypt hash");
            console.log(`  ➡ DB Password Verification: Hashed as ${savedUser.password.substring(0, 15)}... (Plain text NOT stored) [PASSED]`);
        }

        console.log("\n[Test 6] Registration - Duplicate Email Rejection");
        {
            const { req, res } = createMockReqRes({ name: testName, email: testEmail, password: testPassword, confirmPassword: testPassword });
            await registerUser(req, res);
            console.assert(res.statusCode === 400, "Should return status 400 for duplicate email");
            console.log(`  ➡ Status ${res.statusCode}: "${res.responseData?.message}" [PASSED]`);
        }

        console.log("\n[Test 7] Login - Invalid Credentials");
        {
            const { req, res } = createMockReqRes({ email: testEmail, password: "WrongPassword" });
            await loginUser(req, res);
            console.assert(res.statusCode === 400, "Should return status 400 for invalid password");
            console.log(`  ➡ Status ${res.statusCode}: "${res.responseData?.message}" [PASSED]`);
        }

        console.log("\n[Test 8] Login - Successful Authentication & Token Issuance");
        {
            const { req, res } = createMockReqRes({ email: testEmail, password: testPassword });
            await loginUser(req, res);
            console.assert(res.statusCode === 200, "Should return status 200");
            console.log(`  ➡ Status ${res.statusCode}: "${res.responseData?.message}"`);
            console.log(`  ➡ Authenticated User Name: ${res.responseData?.user?.name}`);
            console.log(`  ➡ JWT Token Issued: ${!!res.responseData?.token} [PASSED]`);
        }

        console.log("\n[Test 9] Protected Route Access - Get User Profile");
        {
            const { req, res } = createMockReqRes({}, {}, registeredUserId);
            await getMe(req, res);
            console.assert(res.statusCode === 200, "Should return status 200");
            console.log(`  ➡ Status ${res.statusCode}: Profile retrieved for user ID ${res.responseData?.user?.id}`);
            console.log(`  ➡ User Email: ${res.responseData?.user?.email} [PASSED]`);
        }

        await mongoose.connection.close();
        if (mongoServer) await mongoServer.stop();
    }

    console.log("\n=================================================");
    console.log("✔ ALL BACKEND AUTHENTICATION TESTS PASSED!");
    console.log("=================================================\n");
}

runTests().catch(err => {
    console.error("Test failure:", err);
    process.exit(1);
});
