// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

const processedEvent: EventRecord = {
  ...queuedEvent,
  id: 'evt-processed',
  correlationId: 'evt-processed',
  status: 'processed',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:03.200Z',
};

function buildApi(events: EventRecord[] = [queuedEvent]) {
  return {
    createEvent: vi.fn().mockResolvedValue(queuedEvent),
    listEvents: vi.fn().mockResolvedValue(events),
    getHealth: vi.fn().mockResolvedValue({ live: true, ready: true }),
  };
}

describe('EdgeOps dashboard', () => {
  afterEach(() => cleanup());

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
    expect(await screen.findAllByText('queued')).not.toHaveLength(0);
  });

  it('renders queued, processed and failed event statuses', async () => {
    const api = buildApi([
      queuedEvent,
      processedEvent,
      { ...queuedEvent, id: 'evt-003', correlationId: 'evt-003', status: 'failed', errorReason: 'S3 unavailable' },
    ]);
    render(<App api={api} />);

    expect(await screen.findAllByText('queued')).not.toHaveLength(0);
    expect(screen.getAllByText('processed')).not.toHaveLength(0);
    expect(screen.getAllByText('failed')).not.toHaveLength(0);
    expect(screen.getByText('S3 unavailable')).toBeTruthy();
  });

  it('filters the console by event status', async () => {
    const user = userEvent.setup();
    render(<App api={buildApi([queuedEvent, processedEvent])} />);

    await screen.findByText('evt-processed');
    await user.selectOptions(screen.getByLabelText('Filter events'), 'processed');

    expect(screen.getByText('evt-processed')).toBeTruthy();
    expect(screen.queryByText('evt-001')).toBeNull();
  });

  it('shows event timing metadata for terminal and queued events', async () => {
    render(<App api={buildApi([queuedEvent, processedEvent])} />);

    expect(await screen.findByText('3.2 s')).toBeTruthy();
    expect(screen.getAllByText('—')).not.toHaveLength(0);
    expect(screen.getAllByText('Created')).not.toHaveLength(0);
    expect(screen.getAllByText('Updated')).not.toHaveLength(0);
  });

  it('refreshes the event list on demand', async () => {
    const api = buildApi([queuedEvent]);
    const user = userEvent.setup();
    render(<App api={api} />);

    await screen.findByText('evt-001');
    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(api.listEvents).toHaveBeenCalledTimes(2);
  });

  it('keeps loaded events visible when a refresh fails', async () => {
    const api = buildApi([queuedEvent]);
    api.listEvents.mockResolvedValueOnce([queuedEvent]).mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    render(<App api={api} />);

    expect(await screen.findByText('evt-001')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Unable to refresh EdgeOps status.');
    expect(screen.getByText('evt-001')).toBeTruthy();
  });

  it('retains a newly queued event when an earlier refresh completes late', async () => {
    let resolveEvents: (events: EventRecord[]) => void;
    const api = buildApi([]);
    api.listEvents.mockImplementationOnce(() => new Promise<EventRecord[]>((resolve) => {
      resolveEvents = resolve;
    }));
    const user = userEvent.setup();
    render(<App api={api} />);

    await user.type(screen.getByLabelText('Correlation ID'), 'evt-001');
    await user.click(screen.getByRole('button', { name: 'Queue event' }));
    expect(await screen.findByText('evt-001')).toBeTruthy();

    await act(async () => {
      resolveEvents!([]);
      await Promise.resolve();
    });

    expect(screen.getByText('evt-001')).toBeTruthy();
  });
});
