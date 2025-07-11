const Message = require("../models/Message");

// Fetch paginated messages for a room
exports.getMessages = async (req, res) => {
  const { room = "general", offset = 0, limit = 20 } = req.query;
  try {
    const total = await Message.countDocuments({ room, isPrivate: false });
    const messages = await Message.find({ room, isPrivate: false })
      .sort({ timestamp: 1 })
      .skip(Number(offset))
      .limit(Number(limit));
    const hasMore = total > Number(offset) + messages.length;
    res.json({ messages, hasMore, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Save a new public message
exports.sendMessage = async (data) => {
  const messageData = new Message({
    ...data,
    isPrivate: false,
    timestamp: new Date(),
  });
  await messageData.save();
  return messageData;
};

// Save a new private message
exports.sendPrivateMessage = async (data) => {
  const messageData = new Message({
    ...data,
    isPrivate: true,
    timestamp: new Date(),
    read: false,
  });
  await messageData.save();
  return messageData;
};

// Fetch private messages between two users
exports.getPrivateMessages = async (req, res) => {
  const { user1, user2, offset = 0, limit = 50 } = req.query;
  if (!user1 || !user2) {
    return res.status(400).json({ error: "user1 and user2 are required" });
  }
  try {
    const total = await Message.countDocuments({
      isPrivate: true,
      $or: [
        { sender: user1, toUsername: user2 },
        { sender: user2, toUsername: user1 },
      ],
    });
    const messages = await Message.find({
      isPrivate: true,
      $or: [
        { sender: user1, toUsername: user2 },
        { sender: user2, toUsername: user1 },
      ],
    })
      .sort({ timestamp: 1 })
      .skip(Number(offset))
      .limit(Number(limit));
    const hasMore = total > Number(offset) + messages.length;
    res.json({ messages, hasMore, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
