import type { EventRecord } from '../../../packages/contracts/src/event.js';

export interface SQSEvent {
  Records: Array<{ body: string }>;
}

export interface ProcessorDependencies {
  getRecord(id: string): Promise<EventRecord | undefined>;
  putRecord(record: EventRecord): Promise<void>;
  putEvidence(key: string, record: EventRecord): Promise<void>;
  now(): string;
}

function errorReason(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown processing error';
}

export function createHandler(dependencies: ProcessorDependencies) {
  return async function handler(event: SQSEvent): Promise<void> {
    for (const message of event.Records) {
      const record = JSON.parse(message.body) as EventRecord;
      const existing = await dependencies.getRecord(record.id);

      if (existing?.status === 'processed') {
        continue;
      }

      const evidenceKey = `events/${record.id}.json`;
      const processed: EventRecord = {
        ...record,
        status: 'processed',
        updatedAt: dependencies.now(),
        evidenceKey,
        errorReason: undefined,
      };

      try {
        await dependencies.putEvidence(evidenceKey, processed);
        await dependencies.putRecord(processed);
      } catch (error) {
        const failed: EventRecord = {
          ...record,
          status: 'failed',
          updatedAt: dependencies.now(),
          errorReason: errorReason(error),
          evidenceKey: undefined,
        };
        await dependencies.putRecord(failed);
        throw error;
      }
    }
  };
}
