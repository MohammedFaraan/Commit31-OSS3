const User = require("../models/userModel");

// Get current logged in user profile
// GET /api/users/me
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    console.log(user);
    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        contactNumber: user.contactNumber,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};