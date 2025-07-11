const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  room: { type: String, required: true },
  sender: { type: String, required: true },
  senderId: { type: String },
  message: { type: String },
  image: { type: String },
  timestamp: { type: Date, default: Date.now },
  reactions: { type: mongoose.Schema.Types.Mixed },
  tempId: { type: String },
  to: { type: String },
  isPrivate: { type: Boolean },
  read: { type: Boolean, default: false },
});

module.exports = mongoose.model("Message", messageSchema);
