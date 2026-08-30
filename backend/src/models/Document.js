import mongoose from "mongoose";

const versionSchema = new mongoose.Schema(
  {
    content: {
      type: Buffer,
      required: true,
    },
    label: {
      type: String,
      default: "",
    },
    savedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// One collaborative document per workspace for now (Phase 3 scope).
// `content` holds the latest Yjs state as a binary update; `versions`
// holds capped snapshots for version history / rollback.
const documentSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      unique: true,
    },
    content: {
      type: Buffer,
      default: null,
    },
    versions: {
      type: [versionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Document", documentSchema);
