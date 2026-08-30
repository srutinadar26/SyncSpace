import mongoose from "mongoose";

const diffEntrySchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const activityLogSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "task_created",
        "task_updated",
        "task_status_changed",
        "task_deleted",
        "member_added",
        "member_removed",
        "member_role_changed",
        "milestone_created",
        "milestone_updated",
        "milestone_deleted",
        "goal_created",
        "goal_updated",
        "goal_deleted",
      ],
    },
    // Short human-readable summary, e.g. "Priya moved 'Set up auth' to Done"
    message: {
      type: String,
      required: true,
    },
    diff: {
      type: [diffEntrySchema],
      default: [],
    },
    // Permission/role changes are flagged separately so they can be
    // surfaced in a distinct, clearly-labeled log view.
    sensitive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("ActivityLog", activityLogSchema);
