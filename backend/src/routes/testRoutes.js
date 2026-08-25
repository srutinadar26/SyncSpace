import express from "express";

import {
  studentOnly,
  leadOnly,
  mentorOnly,
} from "../controllers/testController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/student",
  protect,
  authorize("student"),
  studentOnly
);

router.get(
  "/lead",
  protect,
  authorize("lead"),
  leadOnly
);

router.get(
  "/mentor",
  protect,
  authorize("mentor"),
  mentorOnly
);

export default router;