const User = require("../models/User");

// Fetch all users
exports.getUsers = async (req, res) => {
  try {
    const dbUsers = await User.find({});
    res.json(dbUsers.map((u) => ({ username: u.username, id: u.socketId })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add or update a user
exports.upsertUser = async (username, socketId) => {
  return await User.findOneAndUpdate(
    { username },
    { username, socketId },
    { upsert: true, new: true }
  );
};
