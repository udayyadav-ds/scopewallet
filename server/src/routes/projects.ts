import { Router } from "express";
import { z } from "zod";
import { AuthedRequest, requireAuth } from "../auth";
import { prisma } from "../db";
import { parseId } from "../util";

export const projectRouter = Router();
projectRouter.use(requireAuth);

projectRouter.get("/", async (req: AuthedRequest, res) => {
  const projects = await prisma.project.findMany({
    where: { orgId: req.orgId },
    orderBy: { id: "desc" },
    select: {
      id: true,
      name: true,
      client: { select: { id: true, name: true } },
      _count: { select: { requests: true } },
    },
  });
  res.json(projects);
});

const createSchema = z.object({
  clientId: z.number().int().positive(),
  name: z.string().min(1).max(80),
  scopeText: z.string().max(20000).optional(),
});

projectRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const orgId = req.orgId as number;
  // A client from another agency looks exactly like a client that does not exist: 404 for both.
  const client = await prisma.client.findFirst({ where: { id: parsed.data.clientId, orgId }, select: { id: true } });
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  const project = await prisma.project.create({
    data: { name: parsed.data.name, scopeText: parsed.data.scopeText, clientId: client.id, orgId },
    select: { id: true, name: true },
  });
  res.status(201).json(project);
});

const detailSelect = {
  id: true,
  name: true,
  scopeText: true,
  client: { select: { id: true, name: true } },
  requests: {
    orderBy: { id: "desc" as const },
    select: { id: true, message: true, verdict: true, status: true, createdAt: true },
  },
};

projectRouter.get("/:id", async (req: AuthedRequest, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const project = await prisma.project.findFirst({ where: { id, orgId: req.orgId }, select: detailSelect });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(project);
});

const patchSchema = z
  .object({ name: z.string().min(1).max(80).optional(), scopeText: z.string().max(20000).optional() })
  .refine((v) => v.name !== undefined || v.scopeText !== undefined, { message: "Nothing to update" });

projectRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const id = parseId(req.params.id);
  const parsed = patchSchema.safeParse(req.body);
  if (!id || !parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  // updateMany lets the orgId filter sit inside the write itself, not in a separate check.
  const { count } = await prisma.project.updateMany({ where: { id, orgId: req.orgId }, data: parsed.data });
  if (count === 0) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(await prisma.project.findFirst({ where: { id, orgId: req.orgId }, select: detailSelect }));
});

const requestSchema = z.object({ message: z.string().min(1).max(5000) });

projectRouter.post("/:id/requests", async (req: AuthedRequest, res) => {
  const id = parseId(req.params.id);
  const parsed = requestSchema.safeParse(req.body);
  if (!id || !parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const orgId = req.orgId as number;
  const project = await prisma.project.findFirst({ where: { id, orgId }, select: { id: true } });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const created = await prisma.clientRequest.create({
    data: { message: parsed.data.message, projectId: project.id, orgId },
    select: { id: true, message: true, verdict: true, status: true, createdAt: true },
  });
  res.status(201).json(created);
});
