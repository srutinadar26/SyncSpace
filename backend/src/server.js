import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import authRoutes from "./routes/authRoutes.js";
import connectDB from "./config/database.js";
import testRoutes from "./routes/testRoutes.js";
import workspaceRoutes from "./routes/workspaceRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import milestoneRoutes from "./routes/milestoneRoutes.js";
import insightsRoutes from "./routes/insightsRoutes.js";
import securityRoutes from "./routes/securityRoutes.js";
import goalRoutes from "./routes/goalRoutes.js";
import { initSocket } from "./sockets/index.js";
import { initYjs } from "./sockets/yjs.js";
import { apiLimiter } from "./middleware/rateLimiter.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Needed for express-rate-limit and req.ip to work correctly behind a
// reverse proxy (e.g. Render, Vercel, any load balancer setting
// X-Forwarded-For).
app.set("trust proxy", 1);

connectDB();
const io = initSocket(httpServer);
initYjs(io);

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/milestones", milestoneRoutes);
app.use("/api/insights", insightsRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/goals", goalRoutes);

app.get("/", (req, res) => {
  res.json({
    name: "SyncSpace",
    description: "Real-Time Collaborative Workspace for Student Teams",
    status: "operational"
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`SyncSpace server running on port ${PORT}`);
});