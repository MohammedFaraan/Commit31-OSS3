require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const connectDB = require("./config/db");

const helmet = require("helmet");
const cors = require("cors");

const { addUser, removeUser } = require("./utils/socket");

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure correct client IP detection when behind reverse proxies
if (process.env.TRUST_PROXY_HOPS) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS));
}

/* ---------------- SECURITY MIDDLEWARE ---------------- */

// Helmet (secure HTTP headers)
app.use(helmet());

// CORS configuration with allowed origins
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

/* ---------------- BODY PARSING ---------------- */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------------- ROUTES ---------------- */

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const claimRoutes = require("./routes/claim");
const itemRoutes = require("./routes/item");
const messageRoutes = require("./routes/message");

app.get("/", (req, res) => {
  res.send("Backend running successfully 🚀");
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api", claimRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/messages", messageRoutes);

/* ---------------- SOCKET.IO SETUP ---------------- */

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Authenticate socket connections via JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  addUser(socket.userId, socket.id);
  console.log(`Socket connected: ${socket.userId} (${socket.id})`);

  socket.on("disconnect", () => {
    removeUser(socket.id);
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Make io accessible to controllers
app.set("io", io);

/* ---------------- SERVER START ---------------- */

const startServer = async () => {
  try {
    await connectDB();

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();