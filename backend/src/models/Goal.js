import mongoose from "mongoose";

const keyResultSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // "tasks": progress is derived from how many of linkedTasks are DONE.
    // "manual": progress is currentValue / targetValue, set by hand.
    type: {
      type: String,
      enum: ["tasks", "manual"],
      default: "tasks",
    },
    linkedTasks: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
      default: [],
    },
    targetValue: {
      type: Number,
      default: 100,
    },
    currentValue: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

const goalSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    keyResults: {
      type: [keyResultSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Goal", goalSchema);
