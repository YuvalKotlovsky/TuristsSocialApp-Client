import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface User extends JwtPayload {}
  }
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export function verifyAccessToken(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ message: "No token provided" });
    return;
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as JwtPayload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as JwtPayload;
    } catch {
      // ignore invalid token — treat as unauthenticated
    }
  }
  next();
}
