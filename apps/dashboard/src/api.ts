import type { EventInput, EventRecord } from '../../../packages/contracts/src/event.js';

export interface HealthStatus {
  live: boolean;
  ready: boolean;
}

export interface DashboardApi {
  createEvent(input: EventInput): Promise<EventRecord>;
  listEvents(): Promise<EventRecord[]>;
  getHealth(): Promise<HealthStatus>;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export function createBrowserApi(): DashboardApi {
  return {
    createEvent(input) {
      return request<EventRecord>('/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
    },
    listEvents() {
      return request<EventRecord[]>('/api/events');
    },
    async getHealth() {
      const [live, ready] = await Promise.all([
        request<{ live: boolean }>('/health/live'),
        request<{ ready: boolean }>('/health/ready'),
      ]);
      return { live: live.live, ready: ready.ready };
    },
  };
}
