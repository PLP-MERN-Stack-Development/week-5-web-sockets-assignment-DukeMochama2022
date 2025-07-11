// server.js - Main server file for Socket.io chat application

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Store connected users and messages
const users = {};
const messages = [];
const typingUsers = {};

// Add rooms array
const rooms = ["general"]; // Default room

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Emit room list on connection
  socket.emit("room_list", rooms);

  // Handle user joining
  socket.on("user_join", (username) => {
    users[socket.id] = { username, id: socket.id };
    socket.join("general");
    socket.currentRoom = "general";
    io.emit("user_list", Object.values(users));
    io.emit("user_joined", { username, id: socket.id });
    io.emit("room_list", rooms);
    console.log(`${username} joined the chat`);
  });

  // Handle joining a room
  socket.on("join_room", (room) => {
    // Leave all previous rooms except their own socket room
    Object.keys(socket.rooms).forEach((r) => {
      if (r !== socket.id) socket.leave(r);
    });
    socket.join(room);
    socket.currentRoom = room;
    if (!rooms.includes(room)) {
      rooms.push(room);
      io.emit("room_list", rooms);
    }
    io.to(room).emit("user_joined_room", {
      username: users[socket.id]?.username,
      room,
    });
  });

  // Handle chat messages (to room)
  socket.on("send_message", (messageData, callback) => {
    const { message, room, image, tempId } = messageData;
    const currentRoom = room || socket.currentRoom || "general";
    const msgObj = {
      message,
      image,
      id: Date.now(),
      tempId,
      sender: users[socket.id]?.username || "Anonymous",
      senderId: socket.id,
      room: currentRoom,
      timestamp: new Date().toISOString(),
    };
    messages.push(msgObj);
    if (messages.length > 100) messages.shift();
    io.to(currentRoom).emit("receive_message", msgObj);
    if (callback) callback({ delivered: true, id: msgObj.id, tempId });
  });

  // Handle typing indicator
  socket.on("typing", (isTyping) => {
    if (users[socket.id]) {
      const username = users[socket.id].username;

      if (isTyping) {
        typingUsers[socket.id] = username;
      } else {
        delete typingUsers[socket.id];
      }

      io.emit("typing_users", Object.values(typingUsers));
    }
  });

  // Handle private messages
  socket.on("private_message", ({ to, message, image, tempId }, callback) => {
    const messageData = {
      id: Date.now(),
      tempId,
      sender: users[socket.id]?.username || "Anonymous",
      senderId: socket.id,
      to,
      message,
      image,
      timestamp: new Date().toISOString(),
      isPrivate: true,
      read: false,
    };

    socket.to(to).emit("private_message", messageData);
    socket.emit("private_message", messageData);
    if (callback) callback({ delivered: true, id: messageData.id, tempId });
  });

  // Handle private message read receipts
  socket.on("private_message_read", ({ messageId, recipientId }) => {
    // Forward the read receipt to the original sender
    io.to(recipientId).emit("private_message_read", {
      messageId,
      readerId: socket.id,
    });
  });

  // Handle message reactions
  socket.on(
    "message_reaction",
    ({ messageId, reaction, room, isPrivate, recipientId }) => {
      const reactionData = {
        messageId,
        reaction,
        userId: socket.id,
        username: users[socket.id]?.username || "Anonymous",
        timestamp: new Date().toISOString(),
        action: "add",
      };

      if (isPrivate) {
        // For private messages, send to both users
        socket.emit("message_reaction", reactionData);
        socket.to(recipientId).emit("message_reaction", reactionData);
      } else {
        // For room messages, send to all users in the room
        io.to(room).emit("message_reaction", reactionData);
      }
    }
  );

  // Handle reaction removal
  socket.on(
    "remove_reaction",
    ({ messageId, reaction, room, isPrivate, recipientId }) => {
      const reactionData = {
        messageId,
        reaction,
        userId: socket.id,
        username: users[socket.id]?.username || "Anonymous",
        timestamp: new Date().toISOString(),
        action: "remove",
      };

      if (isPrivate) {
        // For private messages, send to both users
        socket.emit("message_reaction", reactionData);
        socket.to(recipientId).emit("message_reaction", reactionData);
      } else {
        // For room messages, send to all users in the room
        io.to(room).emit("message_reaction", reactionData);
      }
    }
  );

  // Handle disconnection
  socket.on("disconnect", () => {
    if (users[socket.id]) {
      const { username } = users[socket.id];
      io.emit("user_left", { username, id: socket.id });
      console.log(`${username} left the chat`);
    }

    delete users[socket.id];
    delete typingUsers[socket.id];

    io.emit("user_list", Object.values(users));
    io.emit("typing_users", Object.values(typingUsers));
  });
});

// API routes
app.get("/api/messages", (req, res) => {
  const { room = "general", offset = 0, limit = 20 } = req.query;
  // Filter messages for the room
  const roomMessages = messages.filter((msg) => msg.room === room);
  // Paginate: get the last N messages, then older
  const start = Math.max(roomMessages.length - offset - limit, 0);
  const end = roomMessages.length - offset;
  const paginated = roomMessages.slice(start, end);
  res.json({
    messages: paginated,
    hasMore: start > 0,
    total: roomMessages.length,
  });
});

app.get("/api/users", (req, res) => {
  res.json(Object.values(users));
});

// Add API endpoint for rooms
app.get("/api/rooms", (req, res) => {
  res.json(rooms);
});

// Root route
app.get("/", (req, res) => {
  res.send("Socket.io Chat Server is running");
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };
