import express from "express";
import {
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from "../controllers/milestoneController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/workspace/:workspaceId", protect, getMilestones);
router.post("/workspace/:workspaceId", protect, createMilestone);
router.patch("/:id", protect, updateMilestone);
router.delete("/:id", protect, deleteMilestone);

export default router;
