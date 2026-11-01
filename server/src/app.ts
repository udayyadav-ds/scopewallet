import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { authRouter } from "./routes/auth";
import { clientRouter } from "./routes/clients";
import { projectRouter } from "./routes/projects";
import { requestRouter } from "./routes/requests";

export const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});
app.use("/api/auth", authRouter);
app.use("/api/clients", clientRouter);
app.use("/api/projects", projectRouter);
app.use("/api/requests", requestRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});
