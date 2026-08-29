import express from "express";

import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  addMember,
  removeMember,
} from "../controllers/workspaceController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createWorkspace);

router.get("/", protect, getMyWorkspaces);

router.get("/:id", protect, getWorkspaceById);

router.post("/:id/members", protect, addMember);

router.delete("/:id/members/:memberId", protect, removeMember);

export default router;