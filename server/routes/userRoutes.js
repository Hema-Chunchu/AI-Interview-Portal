const express = require("express");
const router = express.Router();
const {
    getUserSettings,
    updateUserSettings,
    updatePassword,
    deleteAccount
} = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

// All routes require authentication
router.get("/me/settings", authMiddleware, getUserSettings);
router.patch("/me/settings", authMiddleware, updateUserSettings);
router.put("/me/password", authMiddleware, updatePassword);
router.delete("/me", authMiddleware, deleteAccount);

module.exports = router;
