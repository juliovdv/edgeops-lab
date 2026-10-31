// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { EventRecord } from '../../../packages/contracts/src/event.js';
import { App } from './App.js';

const queuedEvent: EventRecord = {
  id: 'evt-001',
  type: 'heartbeat',
  correlationId: 'evt-001',
  payload: { nodeId: 'raspberrypi' },
  status: 'queued',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
};

function buildApi(events: EventRecord[] = [queuedEvent]) {
  return {
    createEvent: vi.fn().mockResolvedValue(queuedEvent),
    listEvents: vi.fn().mockResolvedValue(events),
    getHealth: vi.fn().mockResolvedValue({ live: true, ready: true }),
  };
}

describe('EdgeOps dashboard', () => {
  it('queues a synthetic event from the panel', async () => {
    const api = buildApi([]);
    const user = userEvent.setup();
    render(<App api={api} />);

    await user.type(screen.getByLabelText('Correlation ID'), 'evt-001');
    await user.click(screen.getByRole('button', { name: 'Queue event' }));

    expect(api.createEvent).toHaveBeenCalledWith({
      type: 'heartbeat',
      correlationId: 'evt-001',
      payload: { nodeId: 'dashboard' },
    });
    expect(await screen.findByText('queued')).toBeTruthy();
  });

  it('renders queued, processed and failed event statuses', async () => {
    const api = buildApi([
      queuedEvent,
      { ...queuedEvent, id: 'evt-002', correlationId: 'evt-002', status: 'processed' },
      { ...queuedEvent, id: 'evt-003', correlationId: 'evt-003', status: 'failed', errorReason: 'S3 unavailable' },
    ]);
    render(<App api={api} />);

    expect(await screen.findByText('queued')).toBeTruthy();
    expect(screen.getByText('processed')).toBeTruthy();
    expect(screen.getByText('failed')).toBeTruthy();
    expect(screen.getByText('S3 unavailable')).toBeTruthy();
  });
});
