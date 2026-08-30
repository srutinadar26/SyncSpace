import Session from "../models/Session.js";

export const getSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user._id, revoked: false }).sort({
      lastUsedAt: -1,
    });

    const currentJti = req.session.jti;

    res.status(200).json({
      sessions: sessions.map((s) => ({
        _id: s._id,
        userAgent: s.userAgent,
        ip: s.ip,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
        isCurrent: s.jti === currentJti,
      })),
    });
  } catch (error) {
    console.error("Get sessions error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({ _id: sessionId, user: req.user._id });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    session.revoked = true;
    session.revokedAt = new Date();
    await session.save();

    res.status(200).json({ message: "Session revoked" });
  } catch (error) {
    console.error("Revoke session error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// "Force logout from all devices": revokes every session for this user
// except the one making the request, so the current device stays logged in.
export const revokeOtherSessions = async (req, res) => {
  try {
    const currentJti = req.session.jti;

    const result = await Session.updateMany(
      { user: req.user._id, revoked: false, jti: { $ne: currentJti } },
      { revoked: true, revokedAt: new Date() }
    );

    res.status(200).json({
      message: "Other sessions logged out",
      revokedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Revoke other sessions error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const getOverview = async (req, res) => {
  try {
    const activeSessionCount = await Session.countDocuments({
      user: req.user._id,
      revoked: false,
    });

    res.status(200).json({
      lastLoginAt: req.user.lastLoginAt,
      failedLoginAttempts: req.user.failedLoginAttempts,
      accountLocked: Boolean(req.user.lockUntil && req.user.lockUntil > new Date()),
      lockUntil: req.user.lockUntil,
      activeSessionCount,
      protections: [
        {
          name: "Rate limiting",
          enabled: true,
          description: "Auth endpoints and the API overall are rate-limited per IP.",
        },
        {
          name: "Role-based access control",
          enabled: true,
          description: "Workspace roles (student/lead/mentor) gate sensitive actions like member management.",
        },
        {
          name: "Input validation",
          enabled: true,
          description: "Required fields and formats are validated server-side on every write endpoint.",
        },
        {
          name: "Audit logging",
          enabled: true,
          description: "Task, member, and milestone changes are recorded with structured diffs (see Activity tab).",
        },
        {
          name: "Account lockout",
          enabled: true,
          description: "Accounts lock for 15 minutes after 5 consecutive failed login attempts.",
        },
        {
          name: "Password hashing",
          enabled: true,
          description: "Passwords are hashed with bcrypt before storage; plaintext is never persisted.",
        },
      ],
    });
  } catch (error) {
    console.error("Get security overview error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
