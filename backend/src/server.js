import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import connectDB from "./config/database.js";
import testRoutes from "./routes/testRoutes.js";


dotenv.config();

const app = express();

connectDB();

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);

app.get("/", (req, res) => {
  res.json({
    name: "SyncSpace",
    description: "Real-Time Collaborative Workspace for Student Teams",
    status: "operational"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`SyncSpace server running on port ${PORT}`);
});