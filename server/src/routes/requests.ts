import { Router } from "express";
import { z } from "zod";
import { AuthedRequest, requireAuth } from "../auth";
import { prisma } from "../db";
import { parseId } from "../util";

export const requestRouter = Router();
requestRouter.use(requireAuth);

const statusSchema = z.object({ status: z.enum(["OPEN", "CHANGE_ORDER_SENT", "APPROVED", "DISMISSED"]) });

requestRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const id = parseId(req.params.id);
  const parsed = statusSchema.safeParse(req.body);
  if (!id || !parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { count } = await prisma.clientRequest.updateMany({
    where: { id, orgId: req.orgId },
    data: { status: parsed.data.status },
  });
  if (count === 0) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  res.json(
    await prisma.clientRequest.findFirst({
      where: { id, orgId: req.orgId },
      select: { id: true, message: true, verdict: true, status: true, createdAt: true },
    })
  );
});
