import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import {
  fieldErrorCode,
  ResetPasswordSchema,
  SigninSchema,
  SignupSchema,
} from "../utils/types";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Users } from "../models/db_models";
import {
  authMiddleware,
  isStaff,
  superAdminMiddleware,
} from "../utils/middleware";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userRouter = Router();

/*
  Auth errors carry a code so the app can show a precise, translated message:
  INVALID_EMAIL, PASSWORD_TOO_SHORT, NAME_REQUIRED, EMAIL_TAKEN,
  ACCOUNT_NOT_FOUND, WRONG_PASSWORD, FORBIDDEN, SERVER_ERROR.
*/
function authError(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({ success: false, code, message });
}

function signToken(user: { _id: unknown; role?: string | null }) {
  return jwt.sign({ userId: user._id, role: user.role || "user" }, process.env.JWT_SECRET!);
}

/** Looks up the account and checks the password, or sends the matching error. */
async function verifyCredentials(req: Request, res: Response) {
  const parsed = SigninSchema.safeParse(req.body);
  if (!parsed.success) {
    const code = fieldErrorCode(parsed.error);
    authError(
      res,
      400,
      code === "INVALID_EMAIL" ? "INVALID_EMAIL" : "INVALID_INPUT",
      code === "INVALID_EMAIL" ? "Enter a valid email address" : "Enter your email and password",
    );
    return null;
  }

  const { email, password } = parsed.data;
  const user = await Users.findOne({ email });
  if (!user || !user.password) {
    authError(res, 404, "ACCOUNT_NOT_FOUND", "No account found with this email");
    return null;
  }

  if (!(await bcrypt.compare(password, user.password))) {
    authError(res, 401, "WRONG_PASSWORD", "The password is incorrect");
    return null;
  }

  return user;
}

userRouter.post("/signin", async (req: Request, res: Response) => {
  try {
    const user = await verifyCredentials(req, res);
    if (!user) return;

    return res.status(200).json({
      success: true,
      message: "Signed in",
      data: { token: signToken(user), role: user.role || "user", name: user.name },
    });
  } catch (error) {
    console.log("[ERROR]", error);
    return authError(res, 500, "SERVER_ERROR", "Internal server error");
  }
});

userRouter.post("/signup", async (req: Request, res: Response) => {
  try {
    console.log("[INFO] in signup route");

    const { success, data } = SignupSchema.safeParse(req.body);
    if (!success) {
      return res.status(401).json({
        success: false,
        message: "Please provide all fields",
      });
    }

    const { email, password, name } = data;

    const user = await Users.findOne({ email });

    if (user) {
      return res.status(401).json({
        success: false,
        message: "User already exists. Go to Sign In",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const dbUser = await Users.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
    });

    const token = jwt.sign(
      { userId: dbUser._id, role: "user" },
      process.env.JWT_SECRET!,
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        token,
        role: "user",
        name: dbUser.name,
      },
    });
  } catch (error) {
    console.log("[ERROR]", error);
    res.status(500).json({
      success: false,
      message: "internal server error",
      error,
    });
  }
});

userRouter.post("/admin/signin", async (req: Request, res: Response) => {
  console.log("[INFO] in admin signin route");
  try {
    const { success, data } = SigninSchema.safeParse(req.body);
    if (!success) {
      return res.status(401).json({
        success: false,
        message: "Please provide all fields",
      });
    }

    const { email, password } = data;
    const user = await Users.findOne({ email });

    if (!user || user.password === "") {
      return res.status(401).json({
        success: false,
        message: "Account not found",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. This account does not have admin privileges.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password!);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Password is incorrect",
      });
    }

    const token = jwt.sign(
      { userId: user._id, role: "admin" },
      process.env.JWT_SECRET!,
    );

    res.status(201).json({
      success: true,
      message: "Admin logged in successfully",
      data: {
        token,
        role: "admin",
        name: user.name,
      },
    });
  } catch (error) {
    console.log("[ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default userRouter;
