import mongoose from "mongoose";

const workspaceMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["student", "lead", "mentor"],
      required: true,
    },
  },
  {
    _id: false,
  }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: {
      type: [workspaceMemberSchema],
      default: [],
    },

    // Optional target date the team is aiming to finish by. Used by the
    // Smart Deadline Prediction feature to flag if the current velocity
    // is on track to miss it.
    targetDeadline: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Workspace = mongoose.model("Workspace", workspaceSchema);

export default Workspace;