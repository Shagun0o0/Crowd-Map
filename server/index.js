const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

// create HTTP server
const server = http.createServer(app);

// setup socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// 🧠 store users (unique per socket)
let users = {};

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // 📍 receive live location
  socket.on("send-location", (data) => {
    users[socket.id] = data;

    // send all active users to everyone
    io.emit("all-locations", Object.values(users));
  });

  // ❌ remove user on disconnect
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);

    delete users[socket.id];

    // update everyone after removal
    io.emit("all-locations", Object.values(users));
  });
});

// simple test route
app.get("/", (req, res) => {
  res.send("🚀 Crowd Map Server Running");
});

// start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});