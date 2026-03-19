const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Item = require("../models/itemModel");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// POST /api/messages
// Send a message to another user about an item
exports.sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { receiver, item, content } = req.body;

    if (receiver === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot send a message to yourself" });
    }

    const receiverUser = await User.findById(receiver);
    if (!receiverUser) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    const existingItem = await Item.findById(item);
    if (!existingItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver,
      item,
      content,
    });

    // Populate for the response and socket emit
    const populated = await Message.findById(message._id)
      .populate("sender", "name email")
      .populate("receiver", "name email")
      .populate("item", "name type");

    // Emit real-time event to receiver
    const io = req.app.get("io");
    if (io) {
      const { notifyUser } = require("./utils/socket");
      notifyUser(io, receiver, "new_message", populated);
    }

    return res.status(201).json(populated);
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/messages/conversations
// List conversations — returns the latest message per conversation partner
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$sender", userId] }, "$receiver", "$sender"],
          },
          lastMessage: { $first: "$$ROOT" },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
    ]);

    // Populate sender and receiver names on the latest messages
    const populated = await User.populate(conversations, [
      { path: "_id", select: "name email" },
      { path: "lastMessage.sender", select: "name email" },
      { path: "lastMessage.receiver", select: "name email" },
    ]);

    return res.json(populated);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/messages/with/:userId
// Get all messages between current user and another user
// Optional query: ?item=<itemId> to filter by item
exports.getMessagesWithUser = async (req, res) => {
  try {
    const otherUserId = req.params.userId;

    if (!isValidObjectId(otherUserId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const userId = req.user._id;

    const filter = {
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
    };

    // Optional item filter
    if (req.query.item) {
      if (!isValidObjectId(req.query.item)) {
        return res.status(400).json({ message: "Invalid item id" });
      }
      filter.item = req.query.item;
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: 1 })
      .populate("sender", "name email")
      .populate("receiver", "name email")
      .populate("item", "name type");

    return res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/messages/:id/read
// Mark a message as read (only the receiver can mark it)
exports.markAsRead = async (req, res) => {
  try {
    const messageId = req.params.id;

    if (!isValidObjectId(messageId)) {
      return res.status(400).json({ message: "Invalid message id" });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the receiver can mark a message as read" });
    }

    message.read = true;
    await message.save();

    return res.json(message);
  } catch (error) {
    console.error("Error marking message as read:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/messages/unread/count
// Get total unread message count for the current user
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user._id,
      read: false,
    });

    return res.json({ unreadCount: count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
