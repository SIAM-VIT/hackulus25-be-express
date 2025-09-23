import { pool } from "../utils/db.js";
import Joi from "joi";

// joi schemas
export const userSchema = Joi.object({
  name: Joi.string().min(1).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .pattern(/^\d\d[A-Z]{3}\d{4}$/)
    .required()
    .messages({
      "string.pattern.base": "Password must be in format ddLLLdddd (2 digits, 3 uppercase letters, 4 digits)"
    }),
  team_name: Joi.string().min(1).required(),
  track_id: Joi.number().integer().required(),
  team_id: Joi.alternatives()
    .try(Joi.number().integer(), Joi.string().pattern(/^\d+$/))
    .optional()
    .allow(null),
  is_leader: Joi.boolean().optional(),
  extra_info: Joi.any().optional().allow(null)
}).unknown(true);  // allow extra fields


export async function findUserByEmail(email) {
  const { error, value } = Joi.string().email().required().validate(email);
  if (error) throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);

  const res = await pool.query("SELECT * FROM users WHERE email = $1", [value]);
  return res.rows[0];
}

export async function findUserById(user_id) {
  const { error, value } = Joi.number().integer().required().validate(user_id);
  if (error) throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);

  const res = await pool.query("SELECT * FROM users WHERE user_id = $1", [value]);
  return res.rows[0];
}

export async function createUser({ name, email, password, team_name, track_id, is_leader = false, extra_info = null }) {
  const { error, value } = userSchema.validate(
    { name, email, password, team_name, track_id, is_leader, extra_info },
    { abortEarly: false }   // unknown keys are allowed already
  ); if (error) throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);

  // Check if team already exists
  const teamRes = await pool.query("SELECT team_id FROM teams WHERE team_name = $1", [team_name]);
  let team_id;

  if (teamRes.rows.length > 0) {
    team_id = teamRes.rows[0].team_id;
  } else {
    // Create new team with provided track_id
    const insertTeamRes = await pool.query(
      `INSERT INTO teams (team_name, track_id) 
       VALUES ($1, $2) 
       RETURNING team_id`,
      [team_name, track_id]
    );
    team_id = insertTeamRes.rows[0].team_id;
  }

  // Insert user linked to the team
  const res = await pool.query(
    `INSERT INTO users (name, email, password_hash, team_id, is_leader, extra_info)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [value.name, value.email, value.password, team_id, value.is_leader, value.extra_info]
  );

  return res.rows[0];
}

