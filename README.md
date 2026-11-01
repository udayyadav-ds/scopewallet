# ScopeWallet

Agencies lose money when clients ask for work the contract does not cover. ScopeWallet keeps each project's contract scope next to every client request, so out-of-scope work gets caught and billed.

**This is slice 1: the foundation.** Accounts, strict per-agency data isolation, clients, projects, contract scope text, and request logging. The Claude-powered scope check is slice 2 (the "Scope check: PENDING" label in the UI is its placeholder).

**Stack:** React + TypeScript + Tailwind (Vite) / Node.js + Express + TypeScript / Prisma / PostgreSQL / JWT / Docker / GitHub Actions

## Run it locally

```bash
docker compose up -d db                   # PostgreSQL (creates scopewallet and scopewallet_test)

cd server
cp .env.example .env                      # set JWT_SECRET to a long random string
npm install
npx prisma migrate dev --name init        # creates the tables AND the migration files. Commit them.
npm run dev                               # API on :4000

cd ../client                              # second terminal
npm install
npm run dev                               # app on :5173
```

## Run the tests

```bash
cd server
npm run test:prepare                      # creates the tables in scopewallet_test
npm test
```

The tests use a real PostgreSQL database and wipe it between tests, so they refuse to run unless `DATABASE_URL` contains `_test`.
If `scopewallet_test` does not exist (you created the Docker volume before using this repo), run `docker compose down -v` once and start again.

## Run the API in Docker

```bash
docker compose --profile api up --build
```

## Design decisions to be able to explain

- **Tenancy:** each agency is an `Organization`. Every business table has an `orgId`, and every query filters on it.
- **The orgId comes from the signed JWT**, never from the request body or URL, so a client cannot ask for another agency's data.
- **Cross-agency access returns 404, not 403**, so a response never confirms that someone else's record exists.
- **Writes filter on orgId too.** Updates use `updateMany({ where: { id, orgId } })`, so the check sits inside the write itself.
- **Integration tests prove the isolation:** Agency B cannot list, read, edit, or add to Agency A's data (`src/api.test.ts`).
- **Input is validated with Zod**, passwords are hashed with bcrypt, JWTs expire after 7 days.

## Git workflow (practice it on this repo)

```bash
git init && git add . && git commit -m "Add ScopeWallet foundation"
git branch -M main
# create an empty repo on GitHub, then:
git remote add origin https://github.com/udayyadav-ds/scopewallet.git
git push -u origin main

git switch -c feat/llm-scope-check       # one branch per feature
# ...work, commit often with clear messages...
git push -u origin feat/llm-scope-check  # open a pull request on GitHub, wait for CI, merge
```

## Not done yet

- Slice 2: Claude scope check with Zod-validated output, a rate limit, and a daily spending cap
- Rate limiting on login, security headers (helmet)
- Deployment (API + managed Postgres on Railway or Render, client on Vercel) and automatic deploy on merge
- A short system design doc
