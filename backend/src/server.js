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
import { initSocket } from "./sockets/index.js";
import { initYjs } from "./sockets/yjs.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

connectDB();
const io = initSocket(httpServer);
initYjs(io);

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/documents", documentRoutes);

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