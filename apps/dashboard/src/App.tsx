import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import { createBrowserApi, type DashboardApi, type HealthStatus } from './api.js';
import { eventStatuses, eventTypes, type EventRecord, type EventStatus } from '../../../packages/contracts/src/event.js';

interface AppProps {
  api?: DashboardApi;
}

const initialHealth: HealthStatus = { live: false, ready: false };
const browserApi = createBrowserApi();
const refreshIntervalMs = 5_000;

type StatusFilter = 'all' | EventStatus;

function formatTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return '—';

  return timestamp.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(event: EventRecord): string {
  if (event.status === 'queued') return '—';

  const elapsedMs = new Date(event.updatedAt).getTime() - new Date(event.createdAt).getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return '—';

  return `${(elapsedMs / 1_000).toFixed(elapsedMs < 10_000 ? 1 : 0)} s`;
}

export function App({ api = browserApi }: AppProps) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [correlationId, setCorrelationId] = useState('');
  const [eventType, setEventType] = useState<(typeof eventTypes)[number]>('heartbeat');
  const [health, setHealth] = useState<HealthStatus>(initialHealth);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>();
  const [queueError, setQueueError] = useState<string>();
  const [refreshError, setRefreshError] = useState<string>();

  const refreshStatus = useCallback(async (initialLoad = false) => {
    setIsRefreshing(true);

    try {
      const [loadedEvents, loadedHealth] = await Promise.all([api.listEvents(), api.getHealth()]);
      setEvents(loadedEvents);
      setHealth(loadedHealth);
      setLastUpdated(new Date());
      setRefreshError(undefined);
    } catch {
      setRefreshError(initialLoad ? 'Unable to load EdgeOps status.' : 'Unable to refresh EdgeOps status.');
    } finally {
      setHasLoaded(true);
      setIsRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    void refreshStatus(true);
    const interval = window.setInterval(() => void refreshStatus(), refreshIntervalMs);
    return () => window.clearInterval(interval);
  }, [refreshStatus]);

  const visibleEvents = useMemo(
    () => events.filter((event) => statusFilter === 'all' || event.status === statusFilter),
    [events, statusFilter],
  );

  async function queueEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQueueError(undefined);

    try {
      const created = await api.createEvent({
        type: eventType,
        correlationId,
        payload: { nodeId: 'dashboard' },
      });
      setEvents((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setHasLoaded(true);
      setCorrelationId('');
    } catch {
      setQueueError('Unable to queue the event.');
    }
  }

  return (
    <main>
      <header>
        <p>EdgeOps Lab</p>
        <h1>Event processing at the edge</h1>
        <dl aria-label="Service health">
          <div><dt>API</dt><dd>{health.live ? 'live' : 'offline'}</dd></div>
          <div><dt>Pipeline</dt><dd>{health.ready ? 'ready' : 'unavailable'}</dd></div>
        </dl>
      </header>

      <section aria-labelledby="queue-title">
        <h2 id="queue-title">Queue a synthetic event</h2>
        <form onSubmit={queueEvent}>
          <label>
            Event type
            <select value={eventType} onChange={(event) => setEventType(event.target.value as typeof eventType)}>
              {eventTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>
            Correlation ID
            <input value={correlationId} onChange={(event) => setCorrelationId(event.target.value)} required />
          </label>
          <button type="submit">Queue event</button>
        </form>
        {queueError ? <p role="alert">{queueError}</p> : null}
      </section>

      <section aria-labelledby="events-title">
        <div className="section-heading">
          <div>
            <h2 id="events-title">Recent events</h2>
            <p className="section-description">Pipeline state refreshes every 5 seconds.</p>
          </div>
          <div className="events-controls">
            <label>
              Filter events
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                <option value="all">All statuses</option>
                {eventStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => void refreshStatus()} disabled={isRefreshing}>
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
        <p className="last-updated" aria-live="polite">
          {lastUpdated ? `Last updated ${formatTimestamp(lastUpdated.toISOString())}` : 'Waiting for first update'}
        </p>
        {refreshError ? <p role="alert">{refreshError}</p> : null}
        {!hasLoaded ? <p className="empty-state">Loading recent events…</p> : null}
        {hasLoaded && visibleEvents.length === 0 ? <p className="empty-state">No events match this filter.</p> : null}
        {visibleEvents.length > 0 ? (
          <ul className="event-list">
            {visibleEvents.map((event) => (
              <li key={event.id} className={`event-row event-row--${event.status}`}>
                <div className="event-summary">
                  <div>
                    <strong>{event.correlationId}</strong>
                    <p>{event.type}</p>
                  </div>
                  <span className={`status-badge status-badge--${event.status}`}>{event.status}</span>
                </div>
                <dl className="event-metadata">
                  <div><dt>Created</dt><dd><time dateTime={event.createdAt}>{formatTimestamp(event.createdAt)}</time></dd></div>
                  <div><dt>Updated</dt><dd><time dateTime={event.updatedAt}>{formatTimestamp(event.updatedAt)}</time></dd></div>
                  <div><dt>Duration</dt><dd>{formatDuration(event)}</dd></div>
                </dl>
                {event.errorReason ? <p className="event-error">{event.errorReason}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
