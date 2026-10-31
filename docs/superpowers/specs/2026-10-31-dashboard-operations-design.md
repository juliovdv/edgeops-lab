# EdgeOps operational dashboard design

## Intent

Turn the existing event form and list into a compact operational console that makes the asynchronous EdgeOps pipeline understandable in a live portfolio demo. A visitor should be able to queue an event and see whether it is queued, processed, or failed, when that state changed, and how long processing took.

## Scope

- Keep the current React/Vite dashboard, API contracts, and LocalStack infrastructure.
- Add an auto-refresh interval while the dashboard is open, with a visible last-updated timestamp and a manual refresh action.
- Display events as responsive operational rows with correlation ID, event type, status badge, created/updated times, and processing duration when available.
- Add an accessible status filter: all, queued, processed, and failed.
- Make failed rows visually distinct and preserve their error reason when present.
- Provide clear loading, empty, and request-error states.

## Non-goals

- No API, Terraform, DynamoDB schema, SQS, or Lambda changes.
- No new DLQ metric endpoint in this iteration.
- No authentication, persistence of filter preferences, pagination, or real-time sockets.

## Approaches considered

1. Console-only UI over the existing `GET /api/events` endpoint: selected. It demonstrates real pipeline state with limited scope and keeps the architecture unchanged.
2. UI plus new SQS/DLQ metrics endpoint: deferred. It would give stronger operational insight but expands API and infrastructure scope.
3. Static portfolio explainer: deferred. Documentation belongs in the README and does not replace an interactive operational view.

## Interaction details

- On first load and every 5 seconds, fetch events and health. Do not clear the existing list while a refresh is pending.
- A queued event added by the form appears immediately; automatic refresh replaces it with the processor's later state.
- The status filter is client-side because the current API returns the complete recent event list.
- Processing duration is `updatedAt - createdAt` for terminal statuses and is shown as an em dash while queued.
- Times are formatted in the browser locale; invalid or missing values show an em dash.

## Verification

- Component tests cover status filtering, duration/timestamp rendering, manual refresh, and error/empty states.
- Existing dashboard behavior for queueing an event remains covered.
- Run the full test suite, typecheck, and dashboard production build before deployment.
