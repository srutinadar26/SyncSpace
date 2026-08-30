import ActivityLog from "../models/ActivityLog.js";
import Workspace from "../models/Workspace.js";

const assertMembership = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return null;
  const isMember = workspace.members.some((m) => m.user.toString() === userId.toString());
  return isMember ? workspace : null;
};

export const getActivity = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { sensitiveOnly, limit = 50, before } = req.query;

    const workspace = await assertMembership(workspaceId, req.user._id);
    if (!workspace) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    const query = { workspace: workspaceId };
    if (sensitiveOnly === "true") query.sensitive = true;
    if (before) query.createdAt = { $lt: new Date(before) };

    const activity = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 100))
      .populate("actor", "name email");

    res.status(200).json({ activity });
  } catch (error) {
    console.error("Get activity error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
