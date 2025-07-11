// server.js - Main server file for Socket.io chat application

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./utils/db");
const Message = require("./models/Message");
const User = require("./models/User");
const messageRoutes = require("./routes/messageRoutes");
const userRoutes = require("./routes/userRoutes");
const roomRoutes = require("./routes/roomRoutes");

// Load environment variables
dotenv.config();

connectDB();
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
  socket.on("user_join", async (username) => {
    users[socket.id] = { username, id: socket.id };
    socket.join("general");
    socket.join(socket.id);
    socket.currentRoom = "general";
    // Upsert user in MongoDB
    await User.findOneAndUpdate(
      { username },
      { username, socketId: socket.id },
      { upsert: true, new: true }
    );
    // Emit updated user list from DB
    const dbUsers = await User.find({});
    io.emit(
      "user_list",
      dbUsers.map((u) => ({ username: u.username, id: u.socketId }))
    );
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

  // Handle public messages
  socket.on(
    "send_message",
    async ({ message, room, image, tempId }, callback) => {
      try {
        const messageData = new Message({
          room,
          sender: users[socket.id]?.username || "Anonymous",
          senderId: socket.id,
          message,
          image,
          tempId,
          timestamp: new Date(),
          isPrivate: false,
        });
        await messageData.save();
        io.to(room).emit("receive_message", messageData.toObject());
        if (callback)
          callback({ delivered: true, id: messageData._id, tempId });
      } catch (err) {
        if (callback)
          callback({ delivered: false, error: err.message, tempId });
      }
    }
  );

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
  socket.on(
    "private_message",
    async ({ to, toUsername, message, image, tempId }, callback) => {
      try {
        console.log(
          "[PRIVATE MESSAGE] to:",
          to,
          "toUsername:",
          toUsername,
          "message:",
          message
        );
        console.log("[USERS]", users);
        // Find recipient username by socket ID
        const recipientUser = users[to];
        const resolvedToUsername = recipientUser
          ? recipientUser.username
          : toUsername;
        const messageData = new Message({
          room: null,
          sender: users[socket.id]?.username || "Anonymous",
          senderId: socket.id,
          to,
          toUsername: resolvedToUsername,
          message,
          image,
          tempId,
          timestamp: new Date(),
          isPrivate: true,
          read: false,
        });
        await messageData.save();
        let delivered = false;
        // Try to deliver by socket ID
        let recipientSocket = io.sockets.sockets.get(to);
        if (recipientSocket) {
          recipientSocket.emit("private_message", messageData.toObject());
          console.log("[PRIVATE MESSAGE] Delivered to socketId:", to);
          delivered = true;
        } else {
          // Try to find by username
          const userEntry = Object.values(users).find(
            (u) => u.username === resolvedToUsername
          );
          if (userEntry) {
            recipientSocket = io.sockets.sockets.get(userEntry.id);
            if (recipientSocket) {
              recipientSocket.emit("private_message", messageData.toObject());
              console.log(
                "[PRIVATE MESSAGE] Fallback delivered to username:",
                resolvedToUsername,
                "socketId:",
                userEntry.id
              );
              delivered = true;
            } else {
              console.warn(
                "[PRIVATE MESSAGE] No socket found for username fallback:",
                resolvedToUsername
              );
            }
          } else {
            console.warn(
              "[PRIVATE MESSAGE] Recipient not found for username:",
              resolvedToUsername
            );
          }
        }
        socket.emit("private_message", messageData.toObject());
        if (callback) {
          if (delivered) {
            callback({ delivered: true, id: messageData._id, tempId });
          } else {
            callback({
              delivered: false,
              error: "Recipient not connected",
              tempId,
            });
          }
        }
      } catch (err) {
        if (callback)
          callback({ delivered: false, error: err.message, tempId });
      }
    }
  );

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

// Use API routes
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);

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
