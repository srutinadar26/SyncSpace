import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Not authorized. No token provided."));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("User no longer exists."));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Invalid or expired token."));
    }
  });

  io.on("connection", (socket) => {
    socket.on("workspace:join", async (workspaceId) => {
      try {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) return;

        const isMember = workspace.members.some(
          (m) => m.user.toString() === socket.user._id.toString()
        );
        if (!isMember) return;

        socket.join(`workspace:${workspaceId}`);
        socket.to(`workspace:${workspaceId}`).emit("presence:joined", {
          userId: socket.user._id,
          name: socket.user.name,
        });
      } catch (err) {
        // silently ignore bad room join attempts
      }
    });

    socket.on("workspace:leave", (workspaceId) => {
      socket.leave(`workspace:${workspaceId}`);
      socket.to(`workspace:${workspaceId}`).emit("presence:left", {
        userId: socket.user._id,
      });
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized yet");
  return io;
};

// Emits an event to everyone in a workspace room, optionally skipping the
// socket that triggered the change (so the actor doesn't double-apply it).
export const emitToWorkspace = (workspaceId, event, payload) => {
  if (!io) return;
  io.to(`workspace:${workspaceId}`).emit(event, payload);
};
