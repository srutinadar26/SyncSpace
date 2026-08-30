import express from "express";
import {
  getRisk,
  getWorkload,
  applyWorkloadRecommendation,
  getDeadlinePrediction,
  setTargetDeadline,
} from "../controllers/insightsController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:workspaceId/risk", protect, getRisk);
router.get("/:workspaceId/workload", protect, getWorkload);
router.post("/:workspaceId/workload/apply", protect, applyWorkloadRecommendation);
router.get("/:workspaceId/deadline-prediction", protect, getDeadlinePrediction);
router.patch("/:workspaceId/target-deadline", protect, setTargetDeadline);

export default router;
