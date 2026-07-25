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
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) {
    return unauthorized(res, "UNAUTHORIZED", "Please sign in.");
  }

  let decoded: JwtPayload & { iat?: number };
  try {
    decoded = jwt.verify(token, secret) as unknown as JwtPayload & { iat?: number };
  } catch (error: any) {
    if (error?.name === "TokenExpiredError") {
      return unauthorized(res, "SESSION_EXPIRED", "Your session has expired. Please sign in again.");
    }
    return unauthorized(res, "UNAUTHORIZED", "Invalid sign-in. Please sign in again.");
  }

  try {
    const user = await Users.findById(decoded.userId).select("role passwordChangedAt");
    if (!user) {
      return unauthorized(res, "UNAUTHORIZED", "This account no longer exists.");
    }
    // 1 s tolerance: token timestamps are whole seconds
    const issuedAt = (decoded.iat ?? 0) * 1000;
    if (user.passwordChangedAt && issuedAt < user.passwordChangedAt.getTime() - 1000) {
      return unauthorized(res, "SESSION_EXPIRED", "Your password was changed. Please sign in again.");
    }

    req.userId = decoded.userId;
    req.userRole = user.role ?? decoded.role;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Authorization check failed" });
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
