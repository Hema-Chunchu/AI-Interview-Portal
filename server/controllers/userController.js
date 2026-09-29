const User = require("../models/User");
const Session = require("../models/Session");
const Question = require("../models/Question");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

// Default interview and notification settings
const DEFAULT_INTERVIEW_SETTINGS = {
    level: "Mid Level",
    questionCount: 4,
    timeLimitMin: 30,
    topics: ["React", "Node.js"],
    voice: true,
    instantFeedback: true,
    saveRecordings: true
};

const DEFAULT_NOTIFICATION_SETTINGS = {
    reportReady: true,
    weeklySummary: true,
    practiceReminders: true,
    productUpdates: false
};

// @desc    Get current user settings & profile
// @route   GET /api/users/me/settings
// @access  Private
const getUserSettings = async (req, res) => {
    try {
        let user = null;
        if (req.userId && mongoose.Types.ObjectId.isValid(req.userId)) {
            user = await User.findById(req.userId).select("-password");
        }

        if (!user) {
            return res.status(404).json({ message: "User account not found." });
        }

        // Ensure defaults if fields are unpopulated
        const interview = {
            ...DEFAULT_INTERVIEW_SETTINGS,
            ...(user.interview?.toObject ? user.interview.toObject() : user.interview || {})
        };

        const notifications = {
            ...DEFAULT_NOTIFICATION_SETTINGS,
            ...(user.notifications?.toObject ? user.notifications.toObject() : user.notifications || {})
        };

        return res.status(200).json({
            name: user.name || "",
            email: user.email || "",
            college: user.college || "",
            targetRole: user.targetRole || "Full Stack",
            authProvider: user.authProvider || "email",
            interview,
            notifications
        });
    } catch (error) {
        console.error("Error in getUserSettings:", error);
        return res.status(500).json({ message: "Server error fetching user settings." });
    }
};

// @desc    Update user settings (partial update)
// @route   PATCH /api/users/me/settings
// @access  Private
const updateUserSettings = async (req, res) => {
    try {
        let user = null;
        if (req.userId && mongoose.Types.ObjectId.isValid(req.userId)) {
            user = await User.findById(req.userId);
        }

        if (!user) {
            return res.status(404).json({ message: "User account not found in database." });
        }

        const { name, college, targetRole, interview, notifications } = req.body;

        // Validation for targetRole
        const ALLOWED_ROLES = ["Frontend", "Backend", "Full Stack", "System Design"];
        if (targetRole && !ALLOWED_ROLES.includes(targetRole)) {
            return res.status(400).json({ message: "Invalid target role selected." });
        }

        // Apply profile updates
        if (typeof name === "string" && name.trim()) user.name = name.trim();
        if (typeof college === "string") user.college = college.trim();
        if (targetRole) user.targetRole = targetRole;

        // Apply nested interview settings
        if (interview) {
            user.interview = {
                level: interview.level || user.interview?.level || DEFAULT_INTERVIEW_SETTINGS.level,
                questionCount: Number(interview.questionCount) || user.interview?.questionCount || DEFAULT_INTERVIEW_SETTINGS.questionCount,
                timeLimitMin: Number(interview.timeLimitMin) || user.interview?.timeLimitMin || DEFAULT_INTERVIEW_SETTINGS.timeLimitMin,
                topics: Array.isArray(interview.topics) ? interview.topics : (user.interview?.topics || DEFAULT_INTERVIEW_SETTINGS.topics),
                voice: typeof interview.voice === "boolean" ? interview.voice : (user.interview?.voice ?? DEFAULT_INTERVIEW_SETTINGS.voice),
                instantFeedback: typeof interview.instantFeedback === "boolean" ? interview.instantFeedback : (user.interview?.instantFeedback ?? DEFAULT_INTERVIEW_SETTINGS.instantFeedback),
                saveRecordings: typeof interview.saveRecordings === "boolean" ? interview.saveRecordings : (user.interview?.saveRecordings ?? DEFAULT_INTERVIEW_SETTINGS.saveRecordings)
            };
        }

        // Apply nested notification settings
        if (notifications) {
            user.notifications = {
                reportReady: typeof notifications.reportReady === "boolean" ? notifications.reportReady : (user.notifications?.reportReady ?? DEFAULT_NOTIFICATION_SETTINGS.reportReady),
                weeklySummary: typeof notifications.weeklySummary === "boolean" ? notifications.weeklySummary : (user.notifications?.weeklySummary ?? DEFAULT_NOTIFICATION_SETTINGS.weeklySummary),
                practiceReminders: typeof notifications.practiceReminders === "boolean" ? notifications.practiceReminders : (user.notifications?.practiceReminders ?? DEFAULT_NOTIFICATION_SETTINGS.practiceReminders),
                productUpdates: typeof notifications.productUpdates === "boolean" ? notifications.productUpdates : (user.notifications?.productUpdates ?? DEFAULT_NOTIFICATION_SETTINGS.productUpdates)
            };
        }

        await user.save();
        console.log(`✔ [SETTINGS SAVED IN MONGODB] User ID: ${user._id} | Name: "${user.name}"`);

        return res.status(200).json({
            message: "Settings updated successfully",
            settings: {
                name: user.name,
                email: user.email,
                college: user.college,
                targetRole: user.targetRole,
                authProvider: user.authProvider || "email",
                interview: user.interview,
                notifications: user.notifications
            }
        });
    } catch (error) {
        console.error("Error in updateUserSettings:", error);
        return res.status(500).json({ message: "Server error saving settings to database." });
    }
};

// @desc    Update user password
// @route   PUT /api/users/me/password
// @access  Private
const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: "User account not found" });
        }

        if (user.authProvider && user.authProvider !== "email") {
            return res.status(400).json({
                message: "Password change is not available for social login accounts."
            });
        }

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: "Please fill in all password fields." });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: "New password must be at least 8 characters long." });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "New password and confirm password do not match." });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect." });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        return res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Error in updatePassword:", error);
        return res.status(500).json({ message: "Server error updating password." });
    }
};

// @desc    Delete user account and all associated data
// @route   DELETE /api/users/me
// @access  Private
const deleteAccount = async (req, res) => {
    try {
        const userId = req.userId;
        const targetEmail = req.body?.email || req.query?.email;

        let deletedUser = null;

        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            deletedUser = await User.findByIdAndDelete(userId);
        }

        if (!deletedUser && targetEmail) {
            deletedUser = await User.findOneAndDelete({ email: targetEmail.toLowerCase().trim() });
        }

        if (deletedUser) {
            const targetId = deletedUser._id;

            // Delete sessions and questions associated with this user
            const userSessions = await Session.find({ userId: targetId }).select("_id");
            const sessionIds = userSessions.map(s => s._id);

            if (sessionIds.length > 0) {
                await Question.deleteMany({ sessionId: { $in: sessionIds } });
            }
            await Session.deleteMany({ userId: targetId });

            console.log(`✔ [ACCOUNT PERMANENTLY DELETED FROM MONGODB] ID: ${targetId} | Email: ${deletedUser.email}`);
            return res.status(200).json({
                success: true,
                message: "Account and associated data deleted permanently from database."
            });
        }

        return res.status(404).json({
            message: "User account not found in database."
        });
    } catch (error) {
        console.error("Error in deleteAccount:", error);
        return res.status(500).json({ message: "Server error deleting account from database." });
    }
};

module.exports = {
    getUserSettings,
    updateUserSettings,
    updatePassword,
    deleteAccount
};
