import { Router } from "express";
import passport from "passport";
import { generateToken } from "../utils/jwtUtils";
import { IUser } from "../models/userModel";

const router = Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  (req, res) => {
    const user = req.user as IUser;
    const token = generateToken(user._id.toString());

    // Redirect back to frontend with the token (adjust URL once frontend exists)
    res.redirect(`http://localhost:5173/auth/callback?token=${token}`);
  }
);

export default router;