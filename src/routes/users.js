import { Router } from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  ensureUserExists,
  requireTeamLeader,
} from "../middleware/userMiddleware.js";
import * as userCtrl from "../controllers/userController.js";

const router = Router();

router.use(verifyToken);
router.use(ensureUserExists);

router.get("/home", userCtrl.getUsersHome);
router.get("/submissions", userCtrl.listMySubmissions);


router.post("/submission/review", requireTeamLeader, userCtrl.submitReview);

router.post("/submission/final", requireTeamLeader, userCtrl.submitFinal);

router.put("/submission/:id", requireTeamLeader, userCtrl.modifySubmission);

router.put(
  "/team/problem-statement",
  requireTeamLeader,
  userCtrl.updateTeamProblemStatement
);

export default router;
