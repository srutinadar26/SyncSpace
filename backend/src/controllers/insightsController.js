import Task from "../models/Task.js";
import Workspace from "../models/Workspace.js";
import {
  computeRiskScore,
  computeWorkload,
  computeDeadlinePrediction,
} from "../services/projectIntelligence.js";
import { emitToWorkspace } from "../sockets/index.js";
import { logActivity } from "../services/activityLogger.js";

const assertMembership = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId).populate("members.user", "name email");
  if (!workspace) return null;
  const isMember = workspace.members.some((m) => m.user._id.toString() === userId.toString());
  return isMember ? workspace : null;
};

// Loads tasks with the same assignedTo/createdBy/dependsOn population and
// isBlocked computation used by the task list endpoint, so the risk engine,
// workload balancer, and deadline predictor all see consistent data.
const loadTasksWithBlockedFlag = async (workspaceId) => {
  const tasks = await Task.find({ workspace: workspaceId })
    .populate("assignedTo", "name email")
    .populate("dependsOn", "status");

  return tasks.map((t) => {
    const obj = t.toObject();
    obj.isBlocked = obj.dependsOn.some((dep) => dep.status !== "DONE");
    return obj;
  });
};

export const getRisk = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await assertMembership(workspaceId, req.user._id);
    if (!workspace) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    const tasks = await loadTasksWithBlockedFlag(workspaceId);
    const risk = computeRiskScore(tasks, workspace.members);

    res.status(200).json({ risk });
  } catch (error) {
    console.error("Get risk error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const getWorkload = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await assertMembership(workspaceId, req.user._id);
    if (!workspace) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    const tasks = await loadTasksWithBlockedFlag(workspaceId);
    const workload = computeWorkload(tasks, workspace.members);

    res.status(200).json({ workload });
  } catch (error) {
    console.error("Get workload error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const applyWorkloadRecommendation = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { taskId, toUserId } = req.body;

    if (!taskId || !toUserId) {
      return res.status(400).json({ message: "taskId and toUserId are required" });
    }

    const workspace = await assertMembership(workspaceId, req.user._id);
    if (!workspace) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    const targetIsMember = workspace.members.some((m) => m.user._id.toString() === toUserId);
    if (!targetIsMember) {
      return res.status(400).json({ message: "Target user is not a member of this workspace" });
    }

    const task = await Task.findOne({ _id: taskId, workspace: workspaceId });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const previousAssignee = task.assignedTo;
    task.assignedTo = toUserId;
    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("dependsOn", "title status");

    emitToWorkspace(workspaceId, "task:updated", { task: updatedTask });

    await logActivity({
      workspaceId,
      actorId: req.user._id,
      type: "task_updated",
      message: `${req.user.name} reassigned "${task.title}" to balance workload`,
      diff: [{ field: "assignedTo", oldValue: previousAssignee, newValue: toUserId }],
    });

    res.status(200).json({ message: "Task reassigned", task: updatedTask });
  } catch (error) {
    console.error("Apply workload recommendation error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const getDeadlinePrediction = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await assertMembership(workspaceId, req.user._id);
    if (!workspace) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    const tasks = await loadTasksWithBlockedFlag(workspaceId);
    const prediction = computeDeadlinePrediction(tasks, workspace.targetDeadline);

    res.status(200).json({ prediction });
  } catch (error) {
    console.error("Get deadline prediction error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const setTargetDeadline = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { targetDeadline } = req.body;

    const workspace = await assertMembership(workspaceId, req.user._id);
    if (!workspace) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    workspace.targetDeadline = targetDeadline || null;
    await workspace.save();

    res.status(200).json({ message: "Target deadline updated", targetDeadline: workspace.targetDeadline });
  } catch (error) {
    console.error("Set target deadline error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
