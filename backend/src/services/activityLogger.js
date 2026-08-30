import ActivityLog from "../models/ActivityLog.js";
import { emitToWorkspace } from "../sockets/index.js";

const SENSITIVE_TYPES = new Set(["member_added", "member_removed", "member_role_changed"]);

/**
 * Records an activity log entry and broadcasts it to everyone currently
 * viewing the workspace. Never throws — a logging failure should not break
 * the request that triggered it.
 */
export const logActivity = async ({ workspaceId, actorId, type, message, diff = [] }) => {
  try {
    const entry = await ActivityLog.create({
      workspace: workspaceId,
      actor: actorId,
      type,
      message,
      diff,
      sensitive: SENSITIVE_TYPES.has(type),
    });

    const populated = await entry.populate("actor", "name email");

    emitToWorkspace(workspaceId.toString(), "activity:new", { activity: populated });
  } catch (error) {
    console.error("Failed to log activity:", error.message);
  }
};
