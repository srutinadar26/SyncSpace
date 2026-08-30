import express from "express";

import {
  createTask,
  getWorkspaceTasks,
  updateTaskStatus,
  updateTask,
  deleteTask,
  setTaskDependencies,
  getDependencyChain,
} from "../controllers/taskController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createTask);

router.get("/workspace/:workspaceId", protect, getWorkspaceTasks);

router.patch("/:taskId/status", protect, updateTaskStatus);

router.put("/:taskId", protect, updateTask);

router.delete("/:taskId", protect, deleteTask);

router.patch("/:taskId/dependencies", protect, setTaskDependencies);

router.get("/:taskId/dependencies", protect, getDependencyChain);

export default router;