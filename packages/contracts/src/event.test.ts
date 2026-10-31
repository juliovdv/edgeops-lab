import { describe, expect, it } from 'vitest';

import { validateEventInput } from './event.js';

describe('validateEventInput', () => {
  it('accepts a synthetic heartbeat event', () => {
    expect(
      validateEventInput({
        type: 'heartbeat',
        correlationId: 'evt-001',
        payload: { nodeId: 'raspberrypi' },
      }),
    ).toEqual({
      type: 'heartbeat',
      correlationId: 'evt-001',
      payload: { nodeId: 'raspberrypi' },
    });
  });

  it('rejects an event without a type', () => {
    expect(() => validateEventInput({ correlationId: 'evt-001', payload: {} })).toThrow();
  });

  it('rejects an unknown event type', () => {
    expect(() =>
      validateEventInput({ type: 'credential.exfiltration', correlationId: 'evt-001', payload: {} }),
    ).toThrow();
  });
});
