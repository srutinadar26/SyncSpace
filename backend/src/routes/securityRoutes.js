import express from "express";
import {
  getSessions,
  revokeSession,
  revokeOtherSessions,
  getOverview,
} from "../controllers/securityController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/overview", protect, getOverview);
router.get("/sessions", protect, getSessions);
router.delete("/sessions/:sessionId", protect, revokeSession);
router.post("/sessions/revoke-others", protect, revokeOtherSessions);

export default router;
