import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { STAFF_ROLES, Users } from "../models/db_models";

export function isStaff(role: string | undefined) {
  return STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]);
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}

interface JwtPayload {
  userId: string;
  role: string;
}

function unauthorized(res: Response, code: "UNAUTHORIZED" | "SESSION_EXPIRED", message: string) {
  return res.status(401).json({ success: false, code, message });
}

/**
 * Accepts a valid, unexpired sign-in (7 days) for an account that still exists
 * and hasn't reset its password since the sign-in was issued.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Please sign in.",
      });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;
    if (!token || !secret) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization header",
      });
    }
    const decoded = jwt.verify(token, secret) as unknown as JwtPayload;

    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

function deny(res: Response) {
  return res.status(403).json({
    success: false,
    code: "FORBIDDEN",
    message: "Access denied. Admin privileges required.",
  });
}

/** Admins and sub-admins (knowledge base management). Re-checks the database role. */
export async function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await Users.findById(req.userId).select("role");
    if (!user || !isStaff(user.role ?? undefined)) return deny(res);
    req.userRole = user.role!;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authorization check failed",
    });
  }
}

/** Main admin only (team management). */
export async function superAdminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await Users.findById(req.userId).select("role");
    if (!user || user.role !== "admin") return deny(res);
    req.userRole = "admin";
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authorization check failed",
    });
  }
}
