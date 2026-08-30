import Milestone from "../models/Milestone.js";
import Workspace from "../models/Workspace.js";
import { emitToWorkspace } from "../sockets/index.js";
import { logActivity } from "../services/activityLogger.js";

const assertMembership = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return null;
  const isMember = workspace.members.some((m) => m.user.toString() === userId.toString());
  return isMember ? workspace : null;
};

export const getMilestones = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await assertMembership(workspaceId, req.user._id);
    if (!workspace) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    const milestones = await Milestone.find({ workspace: workspaceId })
      .sort({ dueDate: 1 })
      .populate("createdBy", "name email");

    res.status(200).json({ milestones });
  } catch (error) {
    console.error("Get milestones error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const createMilestone = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { title, description, dueDate } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ message: "Title and due date are required" });
    }

    const workspace = await assertMembership(workspaceId, req.user._id);
    if (!workspace) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    const milestone = await Milestone.create({
      workspace: workspaceId,
      title,
      description: description || "",
      dueDate,
      createdBy: req.user._id,
    });

    const populated = await milestone.populate("createdBy", "name email");

    emitToWorkspace(workspaceId, "milestone:created", { milestone: populated });

    await logActivity({
      workspaceId,
      actorId: req.user._id,
      type: "milestone_created",
      message: `${req.user.name} added milestone "${title}"`,
    });

    res.status(201).json({ message: "Milestone created", milestone: populated });
  } catch (error) {
    console.error("Create milestone error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, completed } = req.body;

    const milestone = await Milestone.findById(id);
    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    const workspace = await assertMembership(milestone.workspace, req.user._id);
    if (!workspace) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    const diff = [];
    if (title !== undefined && title !== milestone.title) {
      diff.push({ field: "title", oldValue: milestone.title, newValue: title });
      milestone.title = title;
    }
    if (description !== undefined && description !== milestone.description) {
      milestone.description = description;
    }
    if (dueDate !== undefined && new Date(dueDate).getTime() !== new Date(milestone.dueDate).getTime()) {
      diff.push({ field: "dueDate", oldValue: milestone.dueDate, newValue: dueDate });
      milestone.dueDate = dueDate;
    }
    if (completed !== undefined && completed !== milestone.completed) {
      diff.push({ field: "completed", oldValue: milestone.completed, newValue: completed });
      milestone.completed = completed;
    }

    await milestone.save();
    const populated = await milestone.populate("createdBy", "name email");

    emitToWorkspace(milestone.workspace.toString(), "milestone:updated", { milestone: populated });

    if (diff.length > 0) {
      await logActivity({
        workspaceId: milestone.workspace,
        actorId: req.user._id,
        type: "milestone_updated",
        message: `${req.user.name} updated milestone "${milestone.title}"`,
        diff,
      });
    }

    res.status(200).json({ message: "Milestone updated", milestone: populated });
  } catch (error) {
    console.error("Update milestone error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteMilestone = async (req, res) => {
  try {
    const { id } = req.params;

    const milestone = await Milestone.findById(id);
    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    const workspace = await assertMembership(milestone.workspace, req.user._id);
    if (!workspace) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    const workspaceId = milestone.workspace.toString();
    const title = milestone.title;
    await Milestone.findByIdAndDelete(id);

    emitToWorkspace(workspaceId, "milestone:deleted", { milestoneId: id });

    await logActivity({
      workspaceId,
      actorId: req.user._id,
      type: "milestone_deleted",
      message: `${req.user.name} deleted milestone "${title}"`,
    });

    res.status(200).json({ message: "Milestone deleted" });
  } catch (error) {
    console.error("Delete milestone error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
