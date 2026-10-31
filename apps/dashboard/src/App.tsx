import { useEffect, useState, type FormEvent } from 'react';

import { createBrowserApi, type DashboardApi, type HealthStatus } from './api.js';
import { eventTypes, type EventRecord } from '../../../packages/contracts/src/event.js';

interface AppProps {
  api?: DashboardApi;
}

const initialHealth: HealthStatus = { live: false, ready: false };
const browserApi = createBrowserApi();

export function App({ api = browserApi }: AppProps) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [correlationId, setCorrelationId] = useState('');
  const [eventType, setEventType] = useState<(typeof eventTypes)[number]>('heartbeat');
  const [health, setHealth] = useState<HealthStatus>(initialHealth);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void Promise.all([api.listEvents(), api.getHealth()])
      .then(([loadedEvents, loadedHealth]) => {
        setEvents(loadedEvents);
        setHealth(loadedHealth);
      })
      .catch(() => setError('Unable to load EdgeOps status.'));
  }, [api]);

  async function queueEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    try {
      const created = await api.createEvent({
        type: eventType,
        correlationId,
        payload: { nodeId: 'dashboard' },
      });
      setEvents((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setCorrelationId('');
    } catch {
      setError('Unable to queue the event.');
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
        {error ? <p role="alert">{error}</p> : null}
      </section>

      <section aria-labelledby="events-title">
        <h2 id="events-title">Recent events</h2>
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              <strong>{event.correlationId}</strong> <span>{event.status}</span>
              {event.errorReason ? <p>{event.errorReason}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
