import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const secret = () => process.env.JWT_SECRET || "dev-secret-change-me";

export function signToken(userId: number, orgId: number): string {
  return jwt.sign({ sub: userId, org: orgId }, secret(), { expiresIn: "7d" });
}

export interface AuthedRequest extends Request {
  userId?: number;
  orgId?: number;
}

// The orgId comes from the signed token, never from the request body or URL.
// That is what makes "every query filters by orgId" safe.
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), secret()) as unknown as { sub: number; org: number };
    req.userId = payload.sub;
    req.orgId = payload.org;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
