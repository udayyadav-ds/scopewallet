import { Router } from "express";
import { z } from "zod";
import { AuthedRequest, requireAuth } from "../auth";
import { prisma } from "../db";

export const clientRouter = Router();
clientRouter.use(requireAuth);

clientRouter.get("/", async (req: AuthedRequest, res) => {
  const clients = await prisma.client.findMany({
    where: { orgId: req.orgId },
    orderBy: { id: "asc" },
    select: { id: true, name: true, _count: { select: { projects: true } } },
  });
  res.json(clients);
});

const createSchema = z.object({ name: z.string().min(1).max(80) });

clientRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const client = await prisma.client.create({
    data: { name: parsed.data.name, orgId: req.orgId as number },
    select: { id: true, name: true },
  });
  res.status(201).json(client);
});
