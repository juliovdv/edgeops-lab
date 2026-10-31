import { buildApp } from './app.js';
import { createLocalStackDependencies } from './aws.js';

const app = buildApp(
  createLocalStackDependencies({
    endpoint: process.env.LOCALSTACK_ENDPOINT ?? 'http://localstack:4566',
    region: process.env.AWS_REGION ?? 'us-east-1',
    queueUrl: process.env.EVENTS_QUEUE_URL ?? '',
    tableName: process.env.EVENTS_TABLE_NAME ?? 'edgeops-events-table',
  }),
);

await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 3000) });
