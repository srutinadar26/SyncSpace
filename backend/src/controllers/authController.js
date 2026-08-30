import crypto from "crypto";
import User from "../models/User.js";
import Session from "../models/Session.js";
import jwt from "jsonwebtoken";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const generateToken = (user, jti) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      jti,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// Issues a token for a freshly authenticated user and records the
// corresponding session so it shows up in the Security Center and can be
// individually or collectively revoked later.
const issueSessionAndToken = async (user, req) => {
  const jti = crypto.randomUUID();

  await Session.create({
    user: user._id,
    jti,
    userAgent: req.headers["user-agent"] || "",
    ip: req.ip || req.socket?.remoteAddress || "",
  });

  return generateToken(user, jti);
};

export const signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || "student",
      lastLoginAt: new Date(),
    });

    const token = await issueSessionAndToken(user, req);

    res.status(201).json({
      message: "Signup successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Signup error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      return res.status(423).json({
        message: `Too many failed attempts. Try again in ${minutesLeft} minute(s).`,
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
        user.failedLoginAttempts = 0;
      }
      await user.save();

      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    const token = await issueSessionAndToken(user, req);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const logout = async (req, res) => {
  try {
    if (req.session) {
      req.session.revoked = true;
      req.session.revokedAt = new Date();
      await req.session.save();
    }

    res.status(200).json({ message: "Logged out" });
  } catch (error) {
    console.error("Logout error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMe = async (req, res) => {
  res.status(200).json({
    user: req.user,
  });
};
