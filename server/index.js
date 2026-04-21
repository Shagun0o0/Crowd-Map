const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

// ================= SERVER =================
const server = http.createServer(app);

// ================= SOCKET.IO =================
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// ================= DATA =================
// store users (socket.id → location)
let users = {};

// ================= SOCKET CONNECTION =================
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // 📍 receive location
  socket.on("send-location", (data) => {
    users[socket.id] = data;

    // broadcast all users
    io.emit("all-locations", Object.values(users));
  });

  // ❌ remove user when disconnected
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);

    delete users[socket.id];

    io.emit("all-locations", Object.values(users));
  });
});

// ================= TEST ROUTE =================
app.get("/", (req, res) => {
  res.send("🚀 Crowd Map Server Running");
});

// ================= HEALTH CHECK =================
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});