# Operational Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the EdgeOps dashboard a compact operational console for live event processing.

**Architecture:** Keep the existing browser API unchanged. Extend `App` with client-side filtering and periodic refetching, derive display values from `EventRecord`, and style the current event list as responsive operational rows.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, CSS.

**Spec:** `docs/superpowers/specs/2026-10-31-dashboard-operations-design.md`

## Global Constraints

- Do not modify API contracts, Terraform, DynamoDB, SQS, Lambda, or add dependencies.
- Poll every 5 seconds; retain existing events while a refresh is pending.
- Filter client-side across all, queued, processed, and failed statuses.
- Show an em dash for unavailable timestamps or queued processing duration.

## Review Focus

- A queued event must display no completed duration; cover in Task 1 dashboard rendering test.
- Failed events must retain their error reason after filtering; cover in Task 1 filtering test.
- A refresh failure must not erase already loaded events; cover in Task 1 refresh error test.
- Auto-refresh must not multiply timers on re-render; cover in Task 1 fake-timer test.
- Narrow screens must preserve readable event metadata; cover through CSS responsive rules in Task 1 and production build verification.

---

### Task 1: Build the operational event console

**Files:**
- Modify: `apps/dashboard/src/App.tsx`
- Modify: `apps/dashboard/src/styles.css`
- Modify: `apps/dashboard/src/App.test.tsx`

**Interfaces:**
- Consumes: `DashboardApi.listEvents(): Promise<EventRecord[]>`, `DashboardApi.getHealth(): Promise<HealthStatus>`, and `EventRecord` fields from `packages/contracts/src/event.ts`.
- Produces: filterable event rows with status, timestamps, elapsed processing duration, manual refresh, and automatic 5-second refresh.

- [ ] **Step 1: Write failing component tests**

Add tests that assert: selecting `processed` hides queued rows; a processed event renders its created/updated metadata and duration; a queued event renders an em dash duration; manual refresh calls `listEvents` again; and a refresh rejection retains prior rows and displays the request error.

- [ ] **Step 2: Run dashboard tests to verify they fail**

Run: `npm test -- apps/dashboard/src/App.test.tsx`

Expected: FAIL because the filter, metadata, duration, refresh control, and refresh error behavior do not exist.

- [ ] **Step 3: Implement the operational dashboard in `apps/dashboard/src/App.tsx`**

Add a `refreshStatus` operation that refetches events and health, invoke it on mount and at a 5000ms interval with cleanup, and retain existing events when refetching fails. Add `statusFilter` state, derive filtered events before rendering, and use helpers to format timestamps and terminal-status duration.

- [ ] **Step 4: Implement responsive console styling in `apps/dashboard/src/styles.css`**

Style status pills by status, a header toolbar for filter/refresh/last-update, multi-column event metadata rows, error emphasis, and a mobile layout that stacks controls and metadata.

- [ ] **Step 5: Run focused and full verification**

Run: `npm test -- apps/dashboard/src/App.test.tsx && npm test && npm run typecheck && npm run build:dashboard`

Expected: all tests pass, TypeScript exits 0, and Vite generates `dist/dashboard`.

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/src/App.tsx apps/dashboard/src/styles.css apps/dashboard/src/App.test.tsx
git commit -m "feat: add operational event dashboard"
```

## Self-review

- Scope is covered by Task 1: refresh/manual refresh, status filter, state details, durations, and loading/error/empty views are all in the same component boundary.
- No backend or infrastructure changes are planned.
- The task uses existing `DashboardApi` and `EventRecord` types consistently.
- Every Review Focus condition has a named test or CSS verification step.
