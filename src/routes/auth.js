import express from "express";
import Joi from "joi";
import { adminRegister, adminLogin, userSignup, userLogin, logout } from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// admin register
router.post("/admin/register", async (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().allow('', null).optional(),
        email: Joi.string().email().required(),
        password: Joi.string()
            .pattern(/^\d{2}[A-Z]{3}\d{4}$/)
            .required()
            .messages({
                "string.pattern.base": "Password must be in the form ddLLLdddd (d-digit, L-capital letter)"
            }),
        role: Joi.string().optional(),
        panel_id: Joi.alternatives().try(Joi.number().integer(), Joi.string().pattern(/^\d+$/)).optional()
    });

    const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
    if (error) return res.status(400).json({ message: error.details.map(d => d.message).join(", ") });

    return adminRegister(req, res, next);
});

// admin login
router.post("/admin/login", async (req, res, next) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });

    const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
    if (error) return res.status(400).json({ message: error.details.map(d => d.message).join(", ") });

    return adminLogin(req, res, next);
});

// user signup
router.post("/user/signup", async (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().min(1).required(),
        email: Joi.string().email().required(),
        password: Joi.string()
            .pattern(/^\d{2}[A-Z]{3}\d{4}$/)
            .required()
            .messages({
                "string.pattern.base": "Password must be in the form ddLLLdddd (d-digit, L-capital letter)"
            }),
        team_name: Joi.string().min(1).required(),        // mandatory team name
        track_id: Joi.number().integer().required(), is_leader: Joi.boolean().optional(),
        extra_info: Joi.any().optional()
    });

    const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
    if (error) return res.status(400).json({ message: error.details.map(d => d.message).join(", ") });

    return userSignup(req, res, next);
});

// user login
router.post("/user/login", async (req, res, next) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required() // add password validation
    });

    const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
    if (error)
        return res.status(400).json({ message: error.details.map(d => d.message).join(", ") });

    return userLogin(req, res, next);
});

// logout
router.post("/logout", verifyToken, logout);

export default router;
