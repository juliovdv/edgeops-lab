import { z } from 'zod';

export const eventTypes = ['heartbeat', 'job.requested', 'job.failed'] as const;

export type EventType = (typeof eventTypes)[number];

export const eventStatuses = ['queued', 'processed', 'failed'] as const;

export type EventStatus = (typeof eventStatuses)[number];

const eventInputSchema = z
  .object({
    type: z.enum(eventTypes),
    correlationId: z.string().min(1).max(128),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

export type EventInput = z.infer<typeof eventInputSchema>;

export interface EventRecord extends EventInput {
  id: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  errorReason?: string;
  evidenceKey?: string;
}

export function validateEventInput(input: unknown): EventInput {
  return eventInputSchema.parse(input);
}
