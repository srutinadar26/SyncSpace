import express from "express";
import { getGoals, createGoal, updateGoal, deleteGoal } from "../controllers/goalController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/workspace/:workspaceId", protect, getGoals);
router.post("/workspace/:workspaceId", protect, createGoal);
router.patch("/:goalId", protect, updateGoal);
router.delete("/:goalId", protect, deleteGoal);

export default router;
