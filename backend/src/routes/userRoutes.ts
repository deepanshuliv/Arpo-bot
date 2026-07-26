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

/** Sign-ins last 7 days; after that the user signs in again. */
const SESSION_LENGTH = "7d";

function signToken(user: { _id: unknown; role?: string | null }) {
  return jwt.sign({ userId: user._id, role: user.role || "user" }, process.env.JWT_SECRET!, {
    expiresIn: SESSION_LENGTH,
  });
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
    const parsed = SignupSchema.safeParse(req.body);
    if (!parsed.success) {
      const code = fieldErrorCode(parsed.error);
      const messages: Record<string, string> = {
        NAME_REQUIRED: "Enter your name",
        INVALID_EMAIL: "Enter a valid email address",
        PASSWORD_TOO_SHORT: "Password must be at least 6 characters",
        INVALID_INPUT: "Please fill in all fields",
      };
      return authError(res, 400, code, messages[code]!);
    }

    const { email, password, name } = parsed.data;

    if (await Users.exists({ email })) {
      return authError(res, 409, "EMAIL_TAKEN", "An account with this email already exists");
    }

    const dbUser = await Users.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: "user",
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: { token: signToken(dbUser), role: "user", name: dbUser.name },
    });
  } catch (error: any) {
    // Two sign-ups racing for the same email hit the unique index
    if (error?.code === 11000) {
      return authError(res, 409, "EMAIL_TAKEN", "An account with this email already exists");
    }
    console.log("[ERROR]", error);
    return authError(res, 500, "SERVER_ERROR", "Internal server error");
  }
});

userRouter.post("/admin/signin", async (req: Request, res: Response) => {
  try {
    const user = await verifyCredentials(req, res);
    if (!user) return;

    if (!isStaff(user.role ?? undefined)) {
      return authError(res, 403, "FORBIDDEN", "This account does not have admin access");
    }

    return res.status(200).json({
      success: true,
      message: "Admin signed in",
      data: { token: signToken(user), role: user.role, name: user.name },
    });
  } catch (error) {
    console.log("[ERROR]", error);
    return authError(res, 500, "SERVER_ERROR", "Internal server error");
  }
});

/*
  Password reset without email verification (a deliberate product choice):
  enter the account email and a new password twice. On by default; set
  ALLOW_INSECURE_PASSWORD_RESET=false to turn it off.
*/
const resetEnabled = () => process.env.ALLOW_INSECURE_PASSWORD_RESET !== "false";

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req: any) => ipKeyGenerator(req.ip),
  handler: (req, res) =>
    authError(res, 429, "TOO_MANY_ATTEMPTS", "Too many reset attempts. Try again in 15 minutes."),
  standardHeaders: true,
  legacyHeaders: false,
});

userRouter.get("/password/reset", (req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { enabled: resetEnabled() } });
});

userRouter.post("/password/reset", resetLimiter, async (req: Request, res: Response) => {
  try {
    if (!resetEnabled()) {
      return authError(res, 403, "RESET_DISABLED", "Password reset is not available");
    }

    const parsed = ResetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const code = fieldErrorCode(parsed.error);
      return authError(
        res,
        400,
        code === "INVALID_EMAIL" || code === "PASSWORD_TOO_SHORT" ? code : "INVALID_INPUT",
        "Enter your email and a new password of at least 6 characters",
      );
    }

    const { email, password, confirmPassword } = parsed.data;
    if (password !== confirmPassword) {
      return authError(res, 400, "PASSWORDS_DONT_MATCH", "The passwords do not match");
    }

    const user = await Users.findOne({ email });
    if (!user) {
      return authError(res, 404, "ACCOUNT_NOT_FOUND", "No account found with this email");
    }

    user.password = await bcrypt.hash(password, 10);
    // Signs this account out on every device
    user.passwordChangedAt = new Date();
    await user.save();
    console.log(`[INFO] Password reset for ${email}`);

    return res.status(200).json({ success: true, message: "Password updated" });
  } catch (error) {
    console.log("[ERROR]", error);
    return authError(res, 500, "SERVER_ERROR", "Internal server error");
  }
});

/* ───────────── Team (main admin only) ───────────── */

function toTeamMember(u: any) {
  return {
    _id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt ?? null,
  };
}

userRouter.get(
  "/admin/team",
  authMiddleware,
  superAdminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const members = await Users.find({ role: { $in: ["admin", "subadmin"] } })
        .select("name email role createdAt")
        .sort({ role: 1, createdAt: 1 });
      return res.status(200).json({
        success: true,
        data: { members: members.map(toTeamMember) },
      });
    } catch (error) {
      console.log("[ERROR]", error);
      return res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Internal server error" });
    }
  },
);

userRouter.post(
  "/admin/subadmins",
  authMiddleware,
  superAdminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const parsed = SignupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          code: "INVALID_INPUT",
          message: "Name, a valid email and a password of at least 6 characters are required",
        });
      }

      const { name, email, password } = parsed.data;
      const existing = await Users.findOne({ email });

      if (existing && isStaff(existing.role ?? undefined)) {
        return res.status(409).json({
          success: false,
          code: "ALREADY_STAFF",
          message: "This person already has admin access",
        });
      }
      if (existing) {
        return res.status(409).json({
          success: false,
          code: "EMAIL_TAKEN",
          message: "An account with this email already exists",
        });
      }

      const member = await Users.create({
        name,
        email,
        password: await bcrypt.hash(password, 10),
        role: "subadmin",
        addedBy: req.userId,
      });

      return res.status(201).json({ success: true, data: { member: toTeamMember(member) } });
    } catch (error) {
      console.log("[ERROR]", error);
      return res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Internal server error" });
    }
  },
);

/** Removes sub-admin access; the account stays as a normal user (chats are kept). */
userRouter.delete(
  "/admin/subadmins/:id",
  authMiddleware,
  superAdminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const member = mongoose.isValidObjectId(id) ? await Users.findById(id) : null;
      if (!member || member.role !== "subadmin") {
        return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Sub-admin not found" });
      }

      member.role = "user";
      await member.save();
      return res.status(200).json({ success: true });
    } catch (error) {
      console.log("[ERROR]", error);
      return res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Internal server error" });
    }
  },
);

export default userRouter;
