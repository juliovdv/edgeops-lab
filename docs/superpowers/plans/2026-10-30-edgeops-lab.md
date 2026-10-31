# EdgeOps Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight, LAN-only AWS-compatible event-processing lab that runs on a Raspberry Pi without AWS credentials.

**Architecture:** A TypeScript API publishes synthetic events to LocalStack SQS and reads their state from DynamoDB. A Node.js 24 Lambda consumes events, records state and writes JSON evidence to S3. A Vite dashboard calls the API. Docker Compose isolates LocalStack, API and dashboard; Terraform defines all emulated cloud resources.

**Tech Stack:** Node.js 24, TypeScript, React/Vite, Fastify, AWS SDK v3, LocalStack, Terraform, Docker Compose, Vitest, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-30-edgeops-lab-design.md`

## Global Constraints

- Publish only the dashboard on host port `3002`; LocalStack stays on the Compose network.
- Do not modify services or data belonging to the existing Raspberry homelab.
- Use ARM64-compatible images and Lambda architecture `arm64` on the Raspberry.
- Use only synthetic data, no AWS credentials, and clearly label LocalStack as an AWS emulator.
- Bound container logs and avoid optional monitoring services in the MVP.

## Review Focus

- An invalid event type must return a validation error without enqueueing a message (Task 2).
- A LocalStack outage must make readiness fail rather than report false health (Task 2).
- A duplicate SQS delivery must leave one deterministic event state and evidence key (Task 3).
- A Lambda processing error must record `failed` and preserve an inspectable error reason (Task 3).
- The Compose file must expose `3002` only and keep `4566` inaccessible from the host (Task 4).

---

## File Structure

- `apps/dashboard/`: Vite React panel and browser tests.
- `apps/api/`: Fastify API, validation, AWS clients and API tests.
- `apps/processor/`: Lambda handler and unit tests.
- `infra/terraform/`: provider and AWS-compatible resource definitions.
- `infra/scripts/`: repeatable local bootstrap and integration assertions.
- `docker-compose.yml`: isolated runtime topology and log limits.
- `.github/workflows/ci.yml`: lint, unit, build and LocalStack integration jobs.
- `README.md`, `docs/`: operational and portfolio-facing documentation.

### Task 1: Repository foundation and event contract

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `vitest.workspace.ts`, `.gitignore`
- Create: `packages/contracts/src/event.ts`, `packages/contracts/src/event.test.ts`
- Create: `README.md`

**Interfaces:**
- Produces `EventInput`, `EventRecord`, `EventStatus`, `validateEventInput(input: unknown): EventInput` shared by API, Lambda and dashboard.

- [ ] **Step 1: Write failing contract tests** for valid synthetic events and rejected missing/unknown event types.
- [ ] **Step 2: Run** `npm test -- packages/contracts/src/event.test.ts` **and confirm failure** because the contract module does not exist.
- [ ] **Step 3: Implement** the minimal typed event contract and validation in `packages/contracts/src/event.ts`.
- [ ] **Step 4: Run** `npm test -- packages/contracts/src/event.test.ts` **and confirm pass.**
- [ ] **Step 5: Add workspace scripts, TypeScript/Vitest setup, README scope statement and ignores; run** `npm test && npm run typecheck`.
- [ ] **Step 6: Commit** `chore: initialize edgeops workspace`.

### Task 2: API event ingress and readiness

**Files:**
- Create: `apps/api/src/app.ts`, `apps/api/src/aws.ts`, `apps/api/src/server.ts`
- Create: `apps/api/src/app.test.ts`
- Modify: `packages/contracts/src/event.ts`

**Interfaces:**
- Consumes `validateEventInput`.
- Produces `buildApp(deps: ApiDependencies): FastifyInstance`, `POST /api/events`, `GET /api/events`, `GET /health/live`, `GET /health/ready`.

- [ ] **Step 1: Write failing API tests** proving a valid event is enqueued, invalid payload is rejected, and unavailable dependency makes `/health/ready` return 503.
- [ ] **Step 2: Run** `npm test -- apps/api/src/app.test.ts` **and confirm failure** because `buildApp` does not exist.
- [ ] **Step 3: Implement** `buildApp(deps)` with injected queue/state clients and Zod-backed contract validation.
- [ ] **Step 4: Run focused tests, then** `npm test && npm run typecheck`.
- [ ] **Step 5: Commit** `feat: add event ingress API`.

### Task 3: Lambda processor and Terraform resources

**Files:**
- Create: `apps/processor/src/handler.ts`, `apps/processor/src/handler.test.ts`
- Create: `infra/terraform/main.tf`, `infra/terraform/variables.tf`, `infra/terraform/outputs.tf`
- Create: `infra/scripts/bootstrap-localstack.ts`, `infra/scripts/assert-integration.ts`

**Interfaces:**
- Consumes SQS records containing `EventInput` and writes `EventRecord` states.
- Produces `handler(event: SQSEvent): Promise<void>` and Terraform resources `edgeops-events`, `edgeops-events-dlq`, `edgeops-events-table`, `edgeops-evidence`.

- [ ] **Step 1: Write failing handler tests** for processed, duplicate and failed messages, asserting status and deterministic S3 object key.
- [ ] **Step 2: Run** `npm test -- apps/processor/src/handler.test.ts` **and confirm failure** because `handler` does not exist.
- [ ] **Step 3: Implement** minimal idempotent processing with injected AWS clients; store failure reason before rethrowing processing errors.
- [ ] **Step 4: Run handler tests and the full suite.**
- [ ] **Step 5: Add Terraform SQS, Lambda, DynamoDB and S3 definitions plus bootstrap/integration scripts; run** `terraform fmt -check` **and the LocalStack integration assertion.**
- [ ] **Step 6: Commit** `feat: process queued events with lambda`.

### Task 4: Dashboard and isolated Compose runtime

**Files:**
- Create: `apps/dashboard/src/App.tsx`, `apps/dashboard/src/api.ts`, `apps/dashboard/src/App.test.tsx`
- Create: `apps/dashboard/e2e/events.spec.ts`
- Create: `docker-compose.yml`, `apps/*/Dockerfile`
- Modify: `README.md`

**Interfaces:**
- Consumes API `POST /api/events`, `GET /api/events` and health endpoints.
- Produces a dashboard served at `http://<raspberry-ip>:3002` with event submission, status list and health badges.

- [ ] **Step 1: Write failing component/browser tests** for creating an event and rendering queued, processed and failed statuses.
- [ ] **Step 2: Run focused tests and confirm failure** because the dashboard does not exist.
- [ ] **Step 3: Implement** the minimal accessible dashboard and HTTP client.
- [ ] **Step 4: Run dashboard tests and full workspace tests.**
- [ ] **Step 5: Write Compose topology with separate internal network, only `3002:3000` published, LocalStack Docker socket mount, named state volume and JSON log rotation.**
- [ ] **Step 6: Run** `docker compose config` **and assert no host port maps to 4566; build and run the smoke test.**
- [ ] **Step 7: Commit** `feat: add dashboard and compose runtime`.

### Task 5: CI and operational documentation

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `docs/architecture.md`, `docs/operations.md`, `docs/portfolio-case-study.md`
- Modify: `README.md`

**Interfaces:**
- Consumes workspace scripts and `infra/scripts/assert-integration.ts`.
- Produces CI checks for format, typecheck, unit tests, build, Terraform formatting and LocalStack integration.

- [ ] **Step 1: Write a failing workflow validation test/script** asserting the CI file invokes lint, typecheck, test, build and integration commands.
- [ ] **Step 2: Run it and confirm failure** because the workflow does not exist.
- [ ] **Step 3: Implement the GitHub Actions workflow and documentation with local run, deploy, rollback, disk/log inspection and truthful LocalStack wording.**
- [ ] **Step 4: Run the validation script, all project checks and a clean Compose smoke test.**
- [ ] **Step 5: Commit** `ci: add verification and operational docs`.

## Self-review

- Scope coverage: Tasks 1–5 implement the typed flow, dashboard, emulated AWS resources, isolation, tests, CI and documentation required by the spec.
- No AWS credentials or actual AWS deployment are introduced.
- All Review Focus cases have a named owning task and test step.
- Later task interfaces use the contract names introduced by Task 1.
- Runtime verification is deferred until the Raspberry disk review and explicit deployment approval.
