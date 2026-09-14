import { Router, type Request, type Response } from "express";
import { SigninSchema, SignupSchema } from "../utils/types";
import { Users } from "../models/db_models";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userRouter = Router();

userRouter.post("/signin", async (req: Request, res: Response) => {
  console.log("[INFO] in signin route");
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
        message: "User does not exist. Please go to Sign Up page",
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
      { userId: user._id, role: user.role || "user" },
      process.env.JWT_SECRET!,
    );

    res.status(201).json({
      success: true,
      message: "User logged in successfully",
      data: {
        token,
        role: user.role || "user",
        name: user.name,
      },
    });
  } catch (error) {
    console.log("[ERROR]", error);
    res.status(500).json({
      success: false,
      message: "internal server error",
    });
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
