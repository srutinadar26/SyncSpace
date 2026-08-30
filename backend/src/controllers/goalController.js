import Goal from "../models/Goal.js";
import Task from "../models/Task.js";
import Workspace from "../models/Workspace.js";
import { emitToWorkspace } from "../sockets/index.js";
import { logActivity } from "../services/activityLogger.js";

const assertMembership = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return null;
  const isMember = workspace.members.some((m) => m.user.toString() === userId.toString());
  return isMember ? workspace : null;
};

// Computes each key result's progress (0-100) and the goal's overall
// progress as the average across key results — pure aggregation, no ML.
const withProgress = (goal, tasksById) => {
  const obj = goal.toObject();

  obj.keyResults = obj.keyResults.map((kr) => {
    let progress = 0;
    if (kr.type === "tasks") {
      const linked = kr.linkedTasks
        .map((id) => tasksById.get(id.toString()))
        .filter(Boolean);
      const total = linked.length;
      const done = linked.filter((t) => t.status === "DONE").length;
      progress = total > 0 ? Math.round((done / total) * 100) : 0;
      kr.linkedTaskDetails = linked.map((t) => ({ _id: t._id, title: t.title, status: t.status }));
    } else {
      progress = kr.targetValue > 0 ? Math.round((kr.currentValue / kr.targetValue) * 100) : 0;
    }
    return { ...kr, progress: Math.min(progress, 100) };
  });

  obj.progress =
    obj.keyResults.length > 0
      ? Math.round(obj.keyResults.reduce((sum, kr) => sum + kr.progress, 0) / obj.keyResults.length)
      : 0;

  return obj;
};

export const getGoals = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await assertMembership(workspaceId, req.user._id);
    if (!workspace) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    const [goals, tasks] = await Promise.all([
      Goal.find({ workspace: workspaceId }).populate("createdBy", "name email"),
      Task.find({ workspace: workspaceId }).select("title status"),
    ]);

    const tasksById = new Map(tasks.map((t) => [t._id.toString(), t]));

    res.status(200).json({ goals: goals.map((g) => withProgress(g, tasksById)) });
  } catch (error) {
    console.error("Get goals error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const createGoal = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { title, description, keyResults } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const workspace = await assertMembership(workspaceId, req.user._id);
    if (!workspace) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    const goal = await Goal.create({
      workspace: workspaceId,
      title,
      description: description || "",
      keyResults: Array.isArray(keyResults) ? keyResults : [],
      createdBy: req.user._id,
    });

    const populated = await Goal.findById(goal._id).populate("createdBy", "name email");
    const tasks = await Task.find({ workspace: workspaceId }).select("title status");
    const tasksById = new Map(tasks.map((t) => [t._id.toString(), t]));
    const goalWithProgress = withProgress(populated, tasksById);

    emitToWorkspace(workspaceId, "goal:created", { goal: goalWithProgress });

    await logActivity({
      workspaceId,
      actorId: req.user._id,
      type: "goal_created",
      message: `${req.user.name} created goal "${title}"`,
    });

    res.status(201).json({ message: "Goal created", goal: goalWithProgress });
  } catch (error) {
    console.error("Create goal error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateGoal = async (req, res) => {
  try {
    const { goalId } = req.params;
    const { title, description, keyResults } = req.body;

    const goal = await Goal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    const workspace = await assertMembership(goal.workspace, req.user._id);
    if (!workspace) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    if (title !== undefined) goal.title = title;
    if (description !== undefined) goal.description = description;
    if (Array.isArray(keyResults)) goal.keyResults = keyResults;

    await goal.save();

    const populated = await Goal.findById(goal._id).populate("createdBy", "name email");
    const tasks = await Task.find({ workspace: goal.workspace }).select("title status");
    const tasksById = new Map(tasks.map((t) => [t._id.toString(), t]));
    const goalWithProgress = withProgress(populated, tasksById);

    emitToWorkspace(goal.workspace.toString(), "goal:updated", { goal: goalWithProgress });

    await logActivity({
      workspaceId: goal.workspace,
      actorId: req.user._id,
      type: "goal_updated",
      message: `${req.user.name} updated goal "${goal.title}"`,
    });

    res.status(200).json({ message: "Goal updated", goal: goalWithProgress });
  } catch (error) {
    console.error("Update goal error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteGoal = async (req, res) => {
  try {
    const { goalId } = req.params;

    const goal = await Goal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    const workspace = await assertMembership(goal.workspace, req.user._id);
    if (!workspace) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    const workspaceId = goal.workspace.toString();
    const title = goal.title;
    await Goal.findByIdAndDelete(goalId);

    emitToWorkspace(workspaceId, "goal:deleted", { goalId });

    await logActivity({
      workspaceId,
      actorId: req.user._id,
      type: "goal_deleted",
      message: `${req.user.name} deleted goal "${title}"`,
    });

    res.status(200).json({ message: "Goal deleted" });
  } catch (error) {
    console.error("Delete goal error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
