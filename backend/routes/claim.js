const express = require("express");
const router = express.Router();

const {
  createClaim,
  getItemClaims,
  updateClaimStatus,
} = require("../controllers/claimController");
const authMiddleware = require("../middlewares/authMiddleware");

// POST /api/claims
router.post("/claims", authMiddleware, createClaim);

// GET /api/items/:id/claims
router.get("/items/:id/claims", authMiddleware, getItemClaims);

// PATCH /api/claims/:id/status
router.patch("/claims/:id/status", authMiddleware, updateClaimStatus);

module.exports = router;

