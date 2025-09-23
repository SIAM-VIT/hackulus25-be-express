import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

import { findAdminByEmail, createAdmin } from "../models/adminModel.js";
import { findUserByEmail, createUser } from "../models/userModel.js";
import { blacklistToken } from "../models/tokenModel.js";

import Joi from "joi";

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

// admin reg
export async function adminRegister(req, res) {
  try {
    const schema = Joi.object({
      name: Joi.string().allow("", null).optional(),
      email: Joi.string()
        .email()
        .pattern(/^[^@]+@(vitstudent\.ac\.in|vit\.ac\.in)$/)
        .required(),
      password: Joi.string().min(6).required(),
      role: Joi.string().optional(),
      panel_id: Joi.alternatives()
        .try(Joi.number().integer(), Joi.string().pattern(/^\d+$/))
        .optional(),
    });
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (error)
      return res
        .status(400)
        .json({ message: error.details.map((d) => d.message).join(", ") });

    const { name, email, password, role, panel_id } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const existing = await findAdminByEmail(email);
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const admin = await createAdmin({
      name,
      email,
      password_hash: hash,
      role,
      panel_id,
    });
    return res.status(201).json({
      message: "Admin created",
      admin: { admin_id: admin.admin_id, email: admin.email },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

// admin login
export async function adminLogin(req, res) {
  try {
    const schema = Joi.object({
      email: Joi.string()
        .email()
        .pattern(/^[^@]+@(vitstudent\.ac\.in|vit\.ac\.in)$/)
        .required(),
      password: Joi.string().required(),
    });
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (error)
      return res
        .status(400)
        .json({ message: error.details.map((d) => d.message).join(", ") });

    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const admin = await findAdminByEmail(email);
    if (!admin) return res.status(400).json({ message: "Invalid credentials" });

    const matched = await bcrypt.compare(password, admin.password_hash);
    if (!matched)
      return res.status(400).json({ message: "Invalid credentials" });

    return res.status(403).json({ message: "Hackathon has ended" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

// IMP - add pwd hash functionality here, and in schema
export async function userSignup(req, res) {
  try {
    // Updated schema to match model
    const schema = Joi.object({
      name: Joi.string().min(1).required(),
      email: Joi.string()
        .email()
        .pattern(/^[^@]+@(vitstudent\.ac\.in|vit\.ac\.in)$/)
        .required(),
      password: Joi.string()
        .pattern(/^\d{2}[A-Z]{3}\d{4}$/)
        .required()
        .messages({
          "string.pattern.base":
            "Password must be in the form ddLLLdddd (d-digit, L-capital letter)",
        }),
      team_name: Joi.string().min(1).required(),
      track_id: Joi.number().integer().required(),
      is_leader: Joi.boolean().optional(),
      extra_info: Joi.any().optional(),
    });

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (error)
      return res
        .status(400)
        .json({ message: error.details.map((d) => d.message).join(", ") });

    const existing = await findUserByEmail(value.email);
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const user = await createUser({
      name: value.name,
      email: value.email,
      password: value.password, // must not be undefined
      team_name: value.team_name,
      track_id: value.track_id,
      is_leader: value.is_leader || false,
      extra_info: value.extra_info || null,
    });

    return res.status(201).json({
      message: "User created",
      user: { user_id: user.user_id, email: user.email },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

// user login by email only
export async function userLogin(req, res) {
  try {
    const schema = Joi.object({
      email: Joi.string()
        .email()
        .pattern(/^[^@]+@(vitstudent\.ac\.in|vit\.ac\.in)$/)
        .required(),
    });
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (error)
      return res
        .status(400)
        .json({ message: error.details.map((d) => d.message).join(", ") });

    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = signToken({
      id: user.user_id,
      email: user.email,
      role: "user",
      team_id: user.team_id,
      is_leader: user.is_leader,
    });

    return res.status(403).json({ message: "Hackathon has ended" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

// toekn blacklist
export async function logout(req, res) {
  try {
    const headersSchema = Joi.object({
      authorization: Joi.string()
        .pattern(/^Bearer\s+\S+$/)
        .required(),
    });
    const { error } = headersSchema.validate(req.headers, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (error)
      return res
        .status(400)
        .json({ message: error.details.map((d) => d.message).join(", ") });

    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(400).json({ message: "No token provided" });
    const token = authHeader.split(" ")[1];

    await blacklistToken(token);
    return res.json({ message: "Logged out" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}
