import Task from "../models/Task.js";
import Workspace from "../models/Workspace.js";
import { emitToWorkspace } from "../sockets/index.js";
import { logActivity } from "../services/activityLogger.js";

// Repopulates a task with its assignee/creator/dependencies and computes
// the `isBlocked` flag, so every endpoint returns a consistently-shaped
// task object (used directly by the Kanban board and Socket.io payloads).
const populateTask = async (taskId) => {
  const task = await Task.findById(taskId)
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .populate("dependsOn", "title status");

  const obj = task.toObject();
  obj.isBlocked = obj.dependsOn.some((dep) => dep.status !== "DONE");
  return obj;
};

export const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      workspaceId,
      assignedTo,
      priority,
      deadline,
    } = req.body;

    if (!title || !workspaceId) {
      return res.status(400).json({
        message: "Title and workspaceId are required",
      });
    }

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const member = workspace.members.find(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (!member) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const task = await Task.create({
      title,
      description,
      workspace: workspaceId,
      assignedTo: assignedTo || null,
      createdBy: req.user._id,
      priority: priority || "MEDIUM",
      deadline: deadline || null,
    });

    const populatedTask = await populateTask(task._id);

    emitToWorkspace(workspaceId, "task:created", { task: populatedTask });

    await logActivity({
      workspaceId,
      actorId: req.user._id,
      type: "task_created",
      message: `${req.user.name} created task "${title}"`,
    });

    res.status(201).json({
      message: "Task created successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error("Create task error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const getWorkspaceTasks = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const member = workspace.members.find(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (!member) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const tasks = await Task.find({
      workspace: workspaceId,
    })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("dependsOn", "title status")
      .sort({ createdAt: -1 });

    // A task is "blocked" if any of its dependencies aren't done yet.
    const tasksWithBlockedFlag = tasks.map((t) => {
      const obj = t.toObject();
      obj.isBlocked = obj.dependsOn.some((dep) => dep.status !== "DONE");
      return obj;
    });

    res.status(200).json({
      tasks: tasksWithBlockedFlag,
    });
  } catch (error) {
    console.error("Get tasks error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    const validStatuses = ["TODO", "IN_PROGRESS", "DONE"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid task status",
      });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const workspace = await Workspace.findById(task.workspace);

    const member = workspace.members.find(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (!member) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const previousStatus = task.status;
    task.status = status;

    await task.save();

    const updatedTask = await populateTask(task._id);

    emitToWorkspace(task.workspace.toString(), "task:updated", { task: updatedTask });

    if (previousStatus !== status) {
      await logActivity({
        workspaceId: task.workspace,
        actorId: req.user._id,
        type: "task_status_changed",
        message: `${req.user.name} moved "${task.title}" from ${previousStatus} to ${status}`,
        diff: [{ field: "status", oldValue: previousStatus, newValue: status }],
      });
    }

    res.status(200).json({
      message: "Task status updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update task status error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const {
      title,
      description,
      assignedTo,
      priority,
      deadline,
    } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const workspace = await Workspace.findById(task.workspace);

    const member = workspace.members.find(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (!member) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const diff = [];
    const trackChange = (field, newValue) => {
      const oldValue = task[field];
      const oldStr = oldValue === null || oldValue === undefined ? null : oldValue.toString();
      const newStr = newValue === null || newValue === undefined ? null : newValue.toString();
      if (oldStr !== newStr) {
        diff.push({ field, oldValue, newValue });
      }
    };

    if (title !== undefined) {
      trackChange("title", title);
      task.title = title;
    }
    if (description !== undefined) {
      trackChange("description", description);
      task.description = description;
    }
    if (assignedTo !== undefined) {
      trackChange("assignedTo", assignedTo);
      task.assignedTo = assignedTo;
    }
    if (priority !== undefined) {
      trackChange("priority", priority);
      task.priority = priority;
    }
    if (deadline !== undefined) {
      trackChange("deadline", deadline);
      task.deadline = deadline;
    }

    await task.save();

    const updatedTask = await populateTask(task._id);

    emitToWorkspace(task.workspace.toString(), "task:updated", { task: updatedTask });

    if (diff.length > 0) {
      await logActivity({
        workspaceId: task.workspace,
        actorId: req.user._id,
        type: "task_updated",
        message: `${req.user.name} updated "${updatedTask.title}"`,
        diff,
      });
    }

    res.status(200).json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update task error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const workspace = await Workspace.findById(task.workspace);

    const member = workspace.members.find(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (!member) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const workspaceId = task.workspace.toString();
    const title = task.title;
    await Task.findByIdAndDelete(taskId);

    emitToWorkspace(workspaceId, "task:deleted", { taskId });

    await logActivity({
      workspaceId,
      actorId: req.user._id,
      type: "task_deleted",
      message: `${req.user.name} deleted task "${title}"`,
    });

    res.status(200).json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};
// Detects whether adding `newDeps` as dependencies of `taskId` would create
// a dependency cycle (A depends on B, B depends on A, directly or via a
// longer chain) by walking the dependency graph via BFS.
const wouldCreateCycle = async (taskId, newDeps) => {
  const visited = new Set(newDeps.map(String));
  const queue = [...newDeps.map(String)];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId === taskId.toString()) return true;

    const current = await Task.findById(currentId).select("dependsOn");
    if (!current) continue;

    for (const depId of current.dependsOn) {
      const depIdStr = depId.toString();
      if (!visited.has(depIdStr)) {
        visited.add(depIdStr);
        queue.push(depIdStr);
      }
    }
  }

  return false;
};

export const setTaskDependencies = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { dependsOn } = req.body;

    if (!Array.isArray(dependsOn)) {
      return res.status(400).json({
        message: "dependsOn must be an array of task IDs",
      });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const workspace = await Workspace.findById(task.workspace);
    const member = workspace.members.find(
      (member) => member.user.toString() === req.user._id.toString()
    );
    if (!member) {
      return res.status(403).json({ message: "You are not a member of this workspace" });
    }

    const cleanDeps = dependsOn.filter((id) => id !== taskId);

    // Every dependency must belong to the same workspace.
    const validTasks = await Task.find({ _id: { $in: cleanDeps }, workspace: task.workspace });
    if (validTasks.length !== cleanDeps.length) {
      return res.status(400).json({ message: "One or more dependencies are invalid" });
    }

    if (await wouldCreateCycle(taskId, cleanDeps)) {
      return res.status(400).json({
        message: "This would create a circular dependency",
      });
    }

    task.dependsOn = cleanDeps;
    await task.save();

    const updatedTask = await populateTask(task._id);

    emitToWorkspace(task.workspace.toString(), "task:updated", { task: updatedTask });

    await logActivity({
      workspaceId: task.workspace,
      actorId: req.user._id,
      type: "task_updated",
      message: `${req.user.name} updated dependencies for "${task.title}"`,
    });

    res.status(200).json({
      message: "Dependencies updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Set task dependencies error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Returns this task plus everything downstream that would be affected if
// it stays blocked (its dependents, and their dependents, recursively) —
// powers the "blocked task has downstream dependents affected" warning.
export const getDependencyChain = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId).populate("dependsOn", "title status");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const workspace = await Workspace.findById(task.workspace);
    const member = workspace.members.find(
      (member) => member.user.toString() === req.user._id.toString()
    );
    if (!member) {
      return res.status(403).json({ message: "You are not a member of this workspace" });
    }

    const allTasks = await Task.find({ workspace: task.workspace }).select(
      "title status dependsOn"
    );

    // BFS forward through the graph to find every task that (directly or
    // transitively) depends on this one.
    const dependents = [];
    const queue = [taskId.toString()];
    const visited = new Set(queue);

    while (queue.length > 0) {
      const currentId = queue.shift();
      const downstream = allTasks.filter((t) =>
        t.dependsOn.some((d) => d.toString() === currentId)
      );
      for (const t of downstream) {
        if (!visited.has(t._id.toString())) {
          visited.add(t._id.toString());
          dependents.push({ _id: t._id, title: t.title, status: t.status });
          queue.push(t._id.toString());
        }
      }
    }

    res.status(200).json({
      dependsOn: task.dependsOn,
      dependents,
    });
  } catch (error) {
    console.error("Get dependency chain error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
