import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EventRecord } from '../../../packages/contracts/src/event.js';
import { buildApp } from './app.js';

const queuedEvent: EventRecord = {
  id: 'evt-001',
  type: 'heartbeat',
  correlationId: 'evt-001',
  payload: { nodeId: 'raspberrypi' },
  status: 'queued',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
};

function buildDependencies(overrides: Partial<Parameters<typeof buildApp>[0]> = {}) {
  return {
    enqueue: vi.fn().mockResolvedValue(queuedEvent),
    listEvents: vi.fn().mockResolvedValue([queuedEvent]),
    isReady: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('EdgeOps API', () => {
  const apps: Array<ReturnType<typeof buildApp>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('enqueues a valid synthetic event', async () => {
    const dependencies = buildDependencies();
    const app = buildApp(dependencies);
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/events',
      payload: {
        type: 'heartbeat',
        correlationId: 'evt-001',
        payload: { nodeId: 'raspberrypi' },
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual(queuedEvent);
    expect(dependencies.enqueue).toHaveBeenCalledWith({
      type: 'heartbeat',
      correlationId: 'evt-001',
      payload: { nodeId: 'raspberrypi' },
    });
  });

  it('rejects an invalid event without enqueueing it', async () => {
    const dependencies = buildDependencies();
    const app = buildApp(dependencies);
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/events',
      payload: { type: 'unknown', correlationId: 'evt-001', payload: {} },
    });

    expect(response.statusCode).toBe(400);
    expect(dependencies.enqueue).not.toHaveBeenCalled();
  });

  it('reports unavailable dependencies as not ready', async () => {
    const app = buildApp(buildDependencies({ isReady: vi.fn().mockResolvedValue(false) }));
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ ready: false });
  });
});
