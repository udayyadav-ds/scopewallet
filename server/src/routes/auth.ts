import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { AuthedRequest, requireAuth, signToken } from "../auth";
import { prisma } from "../db";

export const authRouter = Router();

const registerSchema = z.object({
  agencyName: z.string().min(1).max(60),
  name: z.string().min(1).max(40),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const { agencyName, name, email, password } = parsed.data;
  if (await prisma.user.findUnique({ where: { email } })) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  // A new account creates its own organization, so every agency is a separate tenant.
  const user = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: agencyName } });
    return tx.user.create({
      data: { email, name, passwordHash, orgId: org.id },
      select: { id: true, name: true, email: true, orgId: true },
    });
  });
  res.status(201).json({
    token: signToken(user.id, user.orgId),
    user: { id: user.id, name: user.name, email: user.email, agencyName },
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, include: { org: true } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  res.json({
    token: signToken(user.id, user.orgId),
    user: { id: user.id, name: user.name, email: user.email, agencyName: user.org.name },
  });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findFirst({
    where: { id: req.userId, orgId: req.orgId },
    select: { id: true, name: true, email: true, org: { select: { name: true } } },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ id: user.id, name: user.name, email: user.email, agencyName: user.org.name });
});
