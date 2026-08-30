import express from "express";
import {
  getDocumentMeta,
  saveVersion,
  restoreVersion,
} from "../controllers/documentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:workspaceId", protect, getDocumentMeta);
router.post("/:workspaceId/versions", protect, saveVersion);
router.post("/:workspaceId/versions/:versionId/restore", protect, restoreVersion);

export default router;
