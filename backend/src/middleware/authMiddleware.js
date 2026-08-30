import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Not authorized. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.jti) {
      return res.status(401).json({
        message: "Session format outdated. Please log in again.",
      });
    }

    const session = await Session.findOne({ jti: decoded.jti });

    if (!session || session.revoked) {
      return res.status(401).json({
        message: "Session expired or logged out. Please log in again.",
      });
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists.",
      });
    }

    // Fire-and-forget: keep "last active" fresh for the Security Center
    // without holding up the request on the write.
    session.lastUsedAt = new Date();
    session.save().catch(() => {});

    req.user = user;
    req.session = session;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to access this resource.",
      });
    }

    next();
  };
};
