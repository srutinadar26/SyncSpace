import Workspace from "../models/Workspace.js";

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