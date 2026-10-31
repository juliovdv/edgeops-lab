import { describe, expect, it, vi } from 'vitest';

import type { EventRecord } from '../../../packages/contracts/src/event.js';
import { createHandler } from './handler.js';

const queuedEvent: EventRecord = {
  id: 'evt-001',
  type: 'heartbeat',
  correlationId: 'evt-001',
  payload: { nodeId: 'raspberrypi' },
  status: 'queued',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
};

function sqsEvent(record: EventRecord) {
  return { Records: [{ body: JSON.stringify(record) }] };
}

function buildDependencies(overrides: Partial<Parameters<typeof createHandler>[0]> = {}) {
  return {
    getRecord: vi.fn().mockResolvedValue(undefined),
    putRecord: vi.fn().mockResolvedValue(undefined),
    putEvidence: vi.fn().mockResolvedValue(undefined),
    now: vi.fn().mockReturnValue('2026-10-30T00:01:00.000Z'),
    ...overrides,
  };
}

describe('event processor', () => {
  it('marks a queued event as processed and archives deterministic evidence', async () => {
    const dependencies = buildDependencies();
    const handler = createHandler(dependencies);

    await handler(sqsEvent(queuedEvent));

    expect(dependencies.putEvidence).toHaveBeenCalledWith(
      'events/evt-001.json',
      expect.objectContaining({ id: 'evt-001', status: 'processed' }),
    );
    expect(dependencies.putRecord).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'processed', evidenceKey: 'events/evt-001.json' }),
    );
  });

  it('does not process an event that was already processed', async () => {
    const dependencies = buildDependencies({
      getRecord: vi.fn().mockResolvedValue({ ...queuedEvent, status: 'processed' }),
    });
    const handler = createHandler(dependencies);

    await handler(sqsEvent(queuedEvent));

    expect(dependencies.putEvidence).not.toHaveBeenCalled();
    expect(dependencies.putRecord).not.toHaveBeenCalled();
  });

  it('records a failed event with its error reason before rethrowing', async () => {
    const dependencies = buildDependencies({ putEvidence: vi.fn().mockRejectedValue(new Error('S3 unavailable')) });
    const handler = createHandler(dependencies);

    await expect(handler(sqsEvent(queuedEvent))).rejects.toThrow('S3 unavailable');

    expect(dependencies.putRecord).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', errorReason: 'S3 unavailable' }),
    );
  });
});
