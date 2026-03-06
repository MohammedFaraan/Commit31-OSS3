const mongoose = require("mongoose");
const Claim = require("../models/claimModel");
const Item = require("../models/itemModel");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const isAdmin = (user) => user && user.role === "admin";

const canManageItem = (item, user) => {
  if (!item || !user) {
    return false;
  }

  return item.user.toString() === user._id.toString() || isAdmin(user);
};

// POST /api/claims
// Create a new claim for an item
exports.createClaim = async (req, res) => {
  try {
    const { item, proofDescription } = req.body || {};

    if (!item || !proofDescription) {
      return res
        .status(400)
        .json({ message: "item and proofDescription are required" });
    }

    if (!isValidObjectId(item)) {
      return res.status(400).json({ message: "Invalid item id" });
    }

    const existingItem = await Item.findById(item);
    if (!existingItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    const duplicateClaim = await Claim.findOne({
      item,
      claimer: req.user && req.user._id,
    });

    if (duplicateClaim) {
      return res
        .status(400)
        .json({ message: "You already have a claim for this item" });
    }

    const claim = await Claim.create({
      item,
      claimer: req.user && req.user._id,
      proofDescription,
    });

    return res.status(201).json(claim);
  } catch (error) {
    console.error("Error creating claim:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/items/:id/claims
// Get all claims for a specific item
exports.getItemClaims = async (req, res) => {
  try {
    const itemId = req.params.id;

    if (!isValidObjectId(itemId)) {
      return res.status(400).json({ message: "Invalid item id" });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (!canManageItem(item, req.user)) {
      return res
        .status(403)
        .json({ message: "Not authorized to view claims for this item" });
    }

    const claims = await Claim.find({ item: itemId }).populate(
      "claimer",
      "name email"
    );

    return res.json(claims);
  } catch (error) {
    console.error("Error fetching claims:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/claims/:id/status
// Update the status of a claim
exports.updateClaimStatus = async (req, res) => {
  try {
    const claimId = req.params.id;
    const { status } = req.body || {};

    if (!isValidObjectId(claimId)) {
      return res.status(400).json({ message: "Invalid claim id" });
    }

    const allowedStatuses = ["pending", "approved", "rejected"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Allowed values: pending, approved, rejected",
      });
    }

    const claim = await Claim.findById(claimId).populate("item");

    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    const item = claim.item;

    if (!canManageItem(item, req.user)) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this claim" });
    }

    claim.status = status;
    await claim.save();

    if (status === "approved" && item) {
      item.status = "claimed";
      await item.save();
    }

    return res.json(claim);
  } catch (error) {
    console.error("Error updating claim status:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

