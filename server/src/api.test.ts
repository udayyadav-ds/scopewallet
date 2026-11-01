import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "./app";
import { prisma } from "./db";

// These tests talk to a real PostgreSQL database and wipe it between tests,
// so refuse to run against anything that is not clearly a test database.
beforeAll(() => {
  if (!process.env.DATABASE_URL?.includes("_test")) {
    throw new Error("Refusing to run: DATABASE_URL must point at a *_test database");
  }
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Organization","User","Client","Project","ClientRequest" RESTART IDENTITY CASCADE'
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function registerAgency(agencyName: string, email: string): Promise<string> {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ agencyName, name: "Owner", email, password: "password123" });
  expect(res.status).toBe(201);
  return res.body.token as string;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function createProject(token: string) {
  const client = await request(app).post("/api/clients").set(auth(token)).send({ name: "Acme" });
  const project = await request(app)
    .post("/api/projects")
    .set(auth(token))
    .send({ clientId: client.body.id, name: "Website rebuild", scopeText: "5 pages. 2 revision rounds." });
  return { clientId: client.body.id as number, projectId: project.body.id as number };
}

describe("auth", () => {
  it("registers an agency and returns a token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ agencyName: "Pixel Co", name: "Sam", email: "sam@pixel.co", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.agencyName).toBe("Pixel Co");
  });

  it("rejects a duplicate email", async () => {
    await registerAgency("A", "dup@example.com");
    const res = await request(app)
      .post("/api/auth/register")
      .send({ agencyName: "B", name: "X", email: "dup@example.com", password: "password123" });
    expect(res.status).toBe(409);
  });

  it("rejects a wrong password", async () => {
    await registerAgency("A", "a@example.com");
    const res = await request(app).post("/api/auth/login").send({ email: "a@example.com", password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("rejects a short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ agencyName: "A", name: "X", email: "x@example.com", password: "short" });
    expect(res.status).toBe(400);
  });
});

describe("protected routes", () => {
  it("returns 401 without a token", async () => {
    expect((await request(app).get("/api/clients")).status).toBe(401);
    expect((await request(app).get("/api/projects")).status).toBe(401);
  });

  it("returns 401 for a forged token", async () => {
    const res = await request(app).get("/api/clients").set(auth("not-a-real-token"));
    expect(res.status).toBe(401);
  });
});

describe("tenant isolation", () => {
  it("never lists another agency's clients or projects", async () => {
    const a = await registerAgency("Agency A", "a@example.com");
    const b = await registerAgency("Agency B", "b@example.com");
    await createProject(a);

    const clients = await request(app).get("/api/clients").set(auth(b));
    const projects = await request(app).get("/api/projects").set(auth(b));
    expect(clients.body).toEqual([]);
    expect(projects.body).toEqual([]);
  });

  it("returns 404 when another agency asks for a project by id", async () => {
    const a = await registerAgency("Agency A", "a@example.com");
    const b = await registerAgency("Agency B", "b@example.com");
    const { projectId } = await createProject(a);

    const res = await request(app).get(`/api/projects/${projectId}`).set(auth(b));
    expect(res.status).toBe(404);
  });

  it("blocks another agency from editing a contract's scope text", async () => {
    const a = await registerAgency("Agency A", "a@example.com");
    const b = await registerAgency("Agency B", "b@example.com");
    const { projectId } = await createProject(a);

    const res = await request(app).patch(`/api/projects/${projectId}`).set(auth(b)).send({ scopeText: "hacked" });
    expect(res.status).toBe(404);
    const still = await request(app).get(`/api/projects/${projectId}`).set(auth(a));
    expect(still.body.scopeText).toBe("5 pages. 2 revision rounds.");
  });

  it("blocks creating a project under another agency's client", async () => {
    const a = await registerAgency("Agency A", "a@example.com");
    const b = await registerAgency("Agency B", "b@example.com");
    const { clientId } = await createProject(a);

    const res = await request(app).post("/api/projects").set(auth(b)).send({ clientId, name: "Sneaky" });
    expect(res.status).toBe(404);
  });

  it("blocks logging or changing requests on another agency's project", async () => {
    const a = await registerAgency("Agency A", "a@example.com");
    const b = await registerAgency("Agency B", "b@example.com");
    const { projectId } = await createProject(a);
    const created = await request(app).post(`/api/projects/${projectId}/requests`).set(auth(a)).send({ message: "Add a blog" });

    const log = await request(app).post(`/api/projects/${projectId}/requests`).set(auth(b)).send({ message: "x" });
    const change = await request(app).patch(`/api/requests/${created.body.id}`).set(auth(b)).send({ status: "APPROVED" });
    expect(log.status).toBe(404);
    expect(change.status).toBe(404);
  });
});

describe("projects and requests", () => {
  it("logs a request and updates its status for the owning agency", async () => {
    const a = await registerAgency("Agency A", "a@example.com");
    const { projectId } = await createProject(a);

    const created = await request(app).post(`/api/projects/${projectId}/requests`).set(auth(a)).send({ message: "Please add a blog" });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("OPEN");
    expect(created.body.verdict).toBe("PENDING");

    const updated = await request(app).patch(`/api/requests/${created.body.id}`).set(auth(a)).send({ status: "CHANGE_ORDER_SENT" });
    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe("CHANGE_ORDER_SENT");
  });

  it("rejects an invalid status value", async () => {
    const a = await registerAgency("Agency A", "a@example.com");
    const { projectId } = await createProject(a);
    const created = await request(app).post(`/api/projects/${projectId}/requests`).set(auth(a)).send({ message: "Add a blog" });
    const res = await request(app).patch(`/api/requests/${created.body.id}`).set(auth(a)).send({ status: "WHATEVER" });
    expect(res.status).toBe(400);
  });

  it("requires a name when creating a client", async () => {
    const a = await registerAgency("Agency A", "a@example.com");
    const res = await request(app).post("/api/clients").set(auth(a)).send({});
    expect(res.status).toBe(400);
  });
});
