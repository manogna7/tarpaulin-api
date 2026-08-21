# Tarpaulin

Tarpaulin is a full-stack sign-off tracker for projects that need proof before they can move forward.

Project leads create requirements, contributors upload evidence, and reviewers approve it or ask for changes. The dashboard shows what is done, what is waiting, and what is blocking the deadline.

## Why This Exists

Teams often manage launch checklists, audit evidence, onboarding tasks, migration approvals, or vendor reviews in spreadsheets and chat threads. That works until nobody knows which proof was uploaded, who reviewed it, or what is still blocking the project.

Tarpaulin gives that work one place to live.

## Features

- Login with seeded demo users
- Project sign-off dashboard
- Create, update, view, and delete projects
- Add contributors and reviewers to a project team
- Create requirement checklists per project
- Evidence uploads limited to the contributor assigned to each requirement
- Review decisions: approved, needs changes, rejected, blocked, in review
- Project-scoped lists, summaries, evidence visibility, and user-directory access
- Transactional project and requirement cleanup, including uploaded files
- MySQL-backed data model
- Redis-backed rate limiting
- Dockerized local development
- Next.js frontend

## Tech Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, Lucide icons
- Backend: Node.js, Express, Sequelize
- Database: MySQL
- Cache/rate limiting: Redis
- Auth: JWT, bcrypt
- Infrastructure: Docker Compose

## Local Setup

Copy the example environment file and update secrets if needed:

```sh
cp .env.example .env
```

Start the backend services:

```sh
docker compose up -d --build
```

Apply the non-destructive database migration for evidence review fields:

```sh
docker compose exec node-app npm run db:migrate
```

Seed or refresh demo projects, requirements, memberships, and sample evidence files without dropping local tables:

```sh
docker compose exec node-app npm run db:seed
```

Optional: reset and seed demo data. This drops and recreates local tables:

```sh
docker compose exec node-app npm run db:reset
```

Start the frontend:

```sh
cd client
npm install
npm run dev -- -p 3001
```

Open:

- Frontend: http://localhost:3001
- API: http://localhost:3000
- Health check: http://localhost:3000/health

## Demo Accounts

```text
Admin
email: admin@tarpaulin.local
password: adminpass

Contributor
email: contributor@tarpaulin.local
password: contributorpass

Project Lead
email: lead@tarpaulin.local
password: leadpass
```

## Product API

The product-facing API uses project sign-off language:

```text
POST /auth/login
GET  /auth/me
GET  /auth/users

GET  /projects/summary
GET  /projects
POST /projects
GET  /projects/:id
PATCH /projects/:id
DELETE /projects/:id
GET  /projects/:id/team
POST /projects/:id/team
DELETE /projects/:id/team/:userId
GET  /projects/:id/requirements
POST /projects/:id/requirements

GET  /requirements/:id
PATCH /requirements/:id
DELETE /requirements/:id
GET  /requirements/:id/evidence
POST /requirements/:id/evidence

GET   /evidence/:id
GET   /evidence/:id/file
PATCH /evidence/:id/review

GET /reviews
GET /health
```

The public API uses project sign-off language. The local database still keeps a
few legacy table names internally so existing development data can be migrated
without a destructive rename.

## Useful Commands

Backend:

```sh
npm run check
npm test
npm run test:api
npm run db:migrate
npm run db:seed
npm run db:reset
```

Frontend:

```sh
cd client
npm run lint
npm run build
```

`npm test` runs focused authorization, input-validation, upload-path safety, and
backend syntax tests. With the Docker services running, `npm run test:api`
exercises login, project scoping, project/team/requirement creation, assigned
uploads, evidence privacy, review, download, and deletion end to end.

## Portfolio Highlights

Tarpaulin demonstrates:

- Translating an existing backend into a clear product domain
- REST API design and route protection
- Relational modeling with Sequelize and MySQL
- JWT authentication and role-aware authorization
- Evidence file uploads with protected downloads
- Dockerized full-stack development
- A practical Next.js dashboard for real project work
- End-to-end product workflow: project creation, team assignment, requirement
  creation, evidence upload, review, download, and cleanup

## Next Improvements

- Expand the API smoke suite into isolated database integration tests
- Add frontend component and browser flow tests
- Add OpenAPI documentation and Swagger UI
- Deploy the frontend and backend with managed database and object storage
