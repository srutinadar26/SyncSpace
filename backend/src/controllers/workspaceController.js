import Workspace from "../models/Workspace.js";
import User from "../models/User.js";
import { emitToWorkspace } from "../sockets/index.js";
import { logActivity } from "../services/activityLogger.js";

export const createWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Workspace name is required",
      });
    }

    const workspace = await Workspace.create({
      name,
      description,
      owner: req.user._id,
      members: [
        {
          user: req.user._id,
          role: "lead",
        },
      ],
    });

    res.status(201).json({
      message: "Workspace created successfully",
      workspace,
    });
  } catch (error) {
    console.error("Create workspace error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const getMyWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      "members.user": req.user._id,
    })
      .populate("owner", "name email")
      .populate("members.user", "name email");

    res.status(200).json({
      workspaces,
    });
  } catch (error) {
    console.error("Get workspaces error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const getWorkspaceById = async (req, res) => {
  try {
    const { id } = req.params;

    const workspace = await Workspace.findById(id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const isMember = workspace.members.some(
      (member) => member.user._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    res.status(200).json({
      workspace,
    });
  } catch (error) {
    console.error("Get workspace error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const addMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const workspace = await Workspace.findById(id);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const requester = workspace.members.find(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (!requester || !["lead", "mentor"].includes(requester.role)) {
      return res.status(403).json({
        message: "Only a team lead or mentor can add members",
      });
    }

    const userToAdd = await User.findOne({ email });

    if (!userToAdd) {
      return res.status(404).json({
        message: "No user found with that email. They need to sign up first.",
      });
    }

    const alreadyMember = workspace.members.some(
      (member) => member.user.toString() === userToAdd._id.toString()
    );

    if (alreadyMember) {
      return res.status(409).json({
        message: "User is already a member of this workspace",
      });
    }

    workspace.members.push({
      user: userToAdd._id,
      role: role || "student",
    });

    await workspace.save();

    const updatedWorkspace = await Workspace.findById(id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    emitToWorkspace(id, "workspace:member_added", { workspace: updatedWorkspace });

    await logActivity({
      workspaceId: id,
      actorId: req.user._id,
      type: "member_added",
      message: `${req.user.name} added ${userToAdd.name} as ${role || "student"}`,
      diff: [{ field: "member", oldValue: null, newValue: { email: userToAdd.email, role: role || "student" } }],
    });

    res.status(200).json({
      message: "Member added successfully",
      workspace: updatedWorkspace,
    });
  } catch (error) {
    console.error("Add member error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;

    const workspace = await Workspace.findById(id);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const requester = workspace.members.find(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (!requester || !["lead", "mentor"].includes(requester.role)) {
      return res.status(403).json({
        message: "Only a team lead or mentor can remove members",
      });
    }

    if (workspace.owner.toString() === memberId) {
      return res.status(400).json({
        message: "Cannot remove the workspace owner",
      });
    }

    const removedMember = workspace.members.find(
      (member) => member.user.toString() === memberId
    );
    const removedUser = removedMember ? await User.findById(memberId).select("name email") : null;

    workspace.members = workspace.members.filter(
      (member) => member.user.toString() !== memberId
    );

    await workspace.save();

    emitToWorkspace(id, "workspace:member_removed", { memberId });

    await logActivity({
      workspaceId: id,
      actorId: req.user._id,
      type: "member_removed",
      message: `${req.user.name} removed ${removedUser?.name || "a member"} from the workspace`,
      diff: [{ field: "member", oldValue: removedUser ? { email: removedUser.email } : null, newValue: null }],
    });

    res.status(200).json({
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Remove member error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};