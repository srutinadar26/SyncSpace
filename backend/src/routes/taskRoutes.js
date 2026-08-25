import express from "express";

import {
  createTask,
  getWorkspaceTasks,
  updateTaskStatus,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createTask);

router.get("/workspace/:workspaceId", protect, getWorkspaceTasks);

router.patch("/:taskId/status", protect, updateTaskStatus);

router.put("/:taskId", protect, updateTask);

router.delete("/:taskId", protect, deleteTask);

export default router;