const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/authMiddleware");
const { getUserProfile } = require("../controllers/userController");

router.get("/me", protect, getUserProfile);

module.exports = router;