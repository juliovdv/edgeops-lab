import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import {
  type EventInput,
  type EventRecord,
  validateEventInput,
} from '../../../packages/contracts/src/event.js';

export interface ApiDependencies {
  enqueue(input: EventInput): Promise<EventRecord>;
  listEvents(): Promise<EventRecord[]>;
  isReady(): Promise<boolean>;
}

export function buildApp(dependencies: ApiDependencies): FastifyInstance {
  const app = Fastify({ logger: false });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: 'Invalid event payload' });
    }

    return reply.send(error);
  });

  app.post('/api/events', async (request, reply) => {
    const event = validateEventInput(request.body);
    const record = await dependencies.enqueue(event);
    return reply.code(202).send(record);
  });

  app.get('/api/events', async () => dependencies.listEvents());

  app.get('/health/live', async () => ({ live: true }));

  app.get('/health/ready', async (_request, reply) => {
    const ready = await dependencies.isReady();
    return reply.code(ready ? 200 : 503).send({ ready });
  });

  return app;
}
