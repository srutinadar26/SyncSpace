import Task from "../models/Task.js";
import Workspace from "../models/Workspace.js";
import { emitToWorkspace } from "../sockets/index.js";
import { logActivity } from "../services/activityLogger.js";

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

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

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
      .sort({ createdAt: -1 });

    res.status(200).json({
      tasks,
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

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

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

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

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