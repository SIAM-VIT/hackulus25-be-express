import path from "path";
import fs from "fs";
import multer from "multer";
import Joi from "joi";
import Redis from "ioredis";
import {
  getSubmissionsByTeam,
  createSubmission,
  getSubmissionById,
  updateSubmission,
} from "../models/submissionModel.js";
import { getWindowByName } from "../models/submissionWindowModel.js";
import db from "../utils/db.js";

const redis = new Redis(process.env.REDIS_URL);

const checkTeamStatus = async (user) => {
  if (user && user.team_id) {
    const teamRes = await db.query(
      "SELECT status FROM teams WHERE team_id = $1",
      [user.team_id]
    );
    if (teamRes.rows[0]?.status === "rejected") {
      throw new Error(
        "Your team has been eliminated and cannot perform this action."
      );
    }
  }
};

const uploadDir = process.env.UPLOAD_DIR || "uploads";
const uploadsPath = path.join(process.cwd(), uploadDir);
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsPath),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, `${ts}_${Math.random().toString(36).slice(2, 5)}_${safe}`); // hash changed to 5 chars
  },
});
const upload = multer({ storage });

function isWindowOpenSync(win) {
  if (!win) return false;
  if (win.open) return true;
  const now = new Date();
  if (win.start_at && win.end_at) {
    return now >= new Date(win.start_at) && now <= new Date(win.end_at);
  }
  return false;
}

// Joi schemas for submissions
const submissionBodySchema = Joi.object({
  type: Joi.string().valid("review1", "review2", "final"),
  title: Joi.string().min(3).max(100),
  description: Joi.string().min(10).max(1000),
  links: Joi.object()
    .pattern(Joi.string(), Joi.string().uri().allow("", null))
    .optional()
    .allow(null),
}).unknown(true);

export const getUsersHome = async (req, res) => {
  try {
    const user = req.currentUser;
    await checkTeamStatus(user);
    if (!user) return res.status(401).json({ error: "Unauthenticated" });
    const cacheKey = `user_home:${user.user_id}`;

    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const teamRow = user.team_id
      ? (
        await db.query(
          "SELECT t.*, tr.name as track_name, tr.problem_statement FROM teams t LEFT JOIN tracks tr ON t.track_id=tr.track_id WHERE t.team_id=$1",
          [user.team_id]
        )
      ).rows[0]
      : null;

    const members = user.team_id
      ? (
        await db.query(
          "SELECT user_id, name, email, is_leader, extra_info FROM users WHERE team_id=$1 ORDER BY user_id",
          [user.team_id]
        )
      ).rows
      : [];

    const review1Window = await getWindowByName("review1");
    const review2Window = await getWindowByName("review2");
    const finalWindow = await getWindowByName("final");
    const phaseResult = await db.query(
      "SELECT current_phase FROM event_status WHERE id=1"
    );
    const currentPhase =
      phaseResult.rows[0]?.current_phase || "Participants reach";

    const responseData = {
      user,
      team: teamRow,
      members,
      windows: {
        review1: isWindowOpenSync(review1Window),
        review2: isWindowOpenSync(review2Window),
        final: isWindowOpenSync(finalWindow),
      },
      currentPhase,
    };
    await redis.set(cacheKey, JSON.stringify(responseData), "EX", 60);
    res.json(responseData);
  } catch (err) {
    console.error("getUsersHome err", err);
    if (err.message.includes("eliminated")) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ error: "server error" });
  }
};

export const listMySubmissions = async (req, res) => {
  try {
    const user = req.currentUser;
    await checkTeamStatus(user);
    if (!user || !user.team_id) return res.json({ submissions: [] });
    const subs = await getSubmissionsByTeam(user.team_id);

    // get original filename from url
    const submissionsWithOriginalName = subs.map((submission) => ({
      ...submission,
      original_filename: submission.file_url
        ? submission.file_url.split("_").slice(2).join("_")
        : null,
    }));

    res.json({ submissions: submissionsWithOriginalName });
  } catch (err) {
    console.error("listMySubmissions err", err);
    if (err.message.includes("eliminated")) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ error: "server error" });
  }
};

export const submitReview = [
  upload.single("file"),
  async (req, res) => {
    try {
      const user = req.currentUser;
      await checkTeamStatus(user);
      if (!user || !user.team_id)
        return res.status(400).json({ error: "User must belong to a team" });
      if (!user.is_leader)
        return res
          .status(403)
          .json({ error: "Only the team leader can submit" });

      const { type } = req.body;
      if (!["review1", "review2"].includes(type))
        return res.status(400).json({ error: "Invalid review type" });

      const window = await getWindowByName(type);
      if (!isWindowOpenSync(window))
        return res
          .status(403)
          .json({ error: `${type} submissions are closed` });

      const { title, description, links } = req.body;

      const finalLinks = links || {};
      if (req.file) {
        finalLinks.file = `/uploads/${req.file.filename}`;
      }

      const created = await createSubmission({
        team_id: user.team_id,
        submitted_by: user.user_id,
        type,
        title,
        description,
        links: finalLinks,
      });
      res.status(201).json({ submission: created });
    } catch (err) {
      console.error("submitReview err", err);
      if (err.message.includes("eliminated")) {
        return res.status(403).json({ message: err.message });
      }
      res.status(500).json({ error: "server error" });
    }
  },
];

export const submitFinal = [
  upload.single("file"),
  async (req, res) => {
    try {
      const user = req.currentUser;
      await checkTeamStatus(user);
      if (!user || !user.team_id)
        return res.status(400).json({ error: "User must belong to a team" });
      if (!user.is_leader)
        return res
          .status(403)
          .json({ error: "Only the team leader can submit" });

      const window = await getWindowByName("final");
      if (!isWindowOpenSync(window))
        return res.status(403).json({ error: "Final submissions are closed" });

      const { title, description, links } = req.body;

      const finalLinks = links || {};
      if (req.file) {
        finalLinks.file = `/uploads/${req.file.filename}`;
      }

      const created = await createSubmission({
        team_id: user.team_id,
        submitted_by: user.user_id,
        type: "final",
        title,
        description,
        links: finalLinks,
      });
      res.status(201).json({ submission: created });
    } catch (err) {
      console.error("submitFinal err", err);
      if (err.message.includes("eliminated")) {
        return res.status(403).json({ message: err.message });
      }
      res.status(500).json({ error: "server error" });
    }
  },
];

export const modifySubmission = [
  upload.single("file"),
  async (req, res) => {
    try {
      const user = req.currentUser;
      await checkTeamStatus(user);
      const { id: submission_id } = req.params;

      if (!user || !user.team_id || !user.is_leader) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const existingSubmission = await getSubmissionById(submission_id);
      if (!existingSubmission || existingSubmission.team_id !== user.team_id) {
        return res.status(404).json({
          error: "Submission not found or you do not have permission.",
        });
      }

      const { title, description, links } = req.body;

      const finalLinks = { ...existingSubmission.links, ...links };
      if (req.file) {
        finalLinks.file = `/uploads/${req.file.filename}`;
      }

      const updated = await updateSubmission(submission_id, {
        team_id: user.team_id,
        type: existingSubmission.type,
        title: title || existingSubmission.title,
        description: description || existingSubmission.description,
        links: finalLinks,
      });

      res.status(200).json({ submission: updated });
    } catch (err) {
      console.error("modifySubmission err", err);
      if (err.message.includes("eliminated")) {
        return res.status(403).json({ message: err.message });
      }
      res.status(500).json({ error: "Server error" });
    }
  },
];

export const updateTeamProblemStatement = async (req, res) => {
  try {
    const user = req.currentUser;
    await checkTeamStatus(user);
    const { problem_statement } = req.body;

    if (!user || !user.team_id) {
      return res.status(400).json({ error: "User must be in a team." });
    }
    if (!user.is_leader) {
      return res.status(403).json({
        error: "Only the team leader can change the problem statement.",
      });
    }
    if (!problem_statement || typeof problem_statement !== "string") {
      return res
        .status(400)
        .json({ error: "A valid problem_statement string is required." });
    }

    await db.query(
      "UPDATE teams SET problem_statement = $1 WHERE team_id = $2",
      [problem_statement, user.team_id]
    );

    res.json({
      success: true,
      message: "Problem statement updated successfully.",
    });
  } catch (err) {
    console.error("updateTeamProblemStatement err", err);
    if (err.message.includes("eliminated")) {
      return res.status(403).json({ message: err.message });
    }
    res
      .status(500)
      .json({ error: "Server error while updating problem statement." });
  }
};
