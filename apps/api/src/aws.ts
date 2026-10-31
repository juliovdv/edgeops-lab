import { randomUUID } from 'node:crypto';

import {
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
  type AttributeValue,
} from '@aws-sdk/client-dynamodb';
import { GetQueueAttributesCommand, SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

import type { ApiDependencies } from './app.js';
import type { EventInput, EventRecord } from '../../../packages/contracts/src/event.js';

export interface LocalStackConfig {
  endpoint: string;
  region: string;
  queueUrl: string;
  tableName: string;
}

function recordToItem(record: EventRecord): Record<string, AttributeValue> {
  return {
    id: { S: record.id },
    type: { S: record.type },
    correlationId: { S: record.correlationId },
    payload: { S: JSON.stringify(record.payload) },
    status: { S: record.status },
    createdAt: { S: record.createdAt },
    updatedAt: { S: record.updatedAt },
  };
}

function itemToRecord(item: Record<string, AttributeValue>): EventRecord {
  return {
    id: item.id?.S ?? '',
    type: item.type?.S as EventRecord['type'],
    correlationId: item.correlationId?.S ?? '',
    payload: JSON.parse(item.payload?.S ?? '{}') as Record<string, unknown>,
    status: item.status?.S as EventRecord['status'],
    createdAt: item.createdAt?.S ?? '',
    updatedAt: item.updatedAt?.S ?? '',
  };
}

export function createLocalStackDependencies(config: LocalStackConfig): ApiDependencies {
  const clientConfig = {
    endpoint: config.endpoint,
    region: config.region,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  };
  const sqs = new SQSClient(clientConfig);
  const dynamo = new DynamoDBClient(clientConfig);

  async function enqueue(input: EventInput): Promise<EventRecord> {
    const timestamp = new Date().toISOString();
    const record: EventRecord = {
      ...input,
      id: randomUUID(),
      status: 'queued',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await dynamo.send(new PutItemCommand({ TableName: config.tableName, Item: recordToItem(record) }));
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: config.queueUrl,
        MessageBody: JSON.stringify(record),
      }),
    );
    return record;
  }

  return {
    enqueue,
    async listEvents() {
      const result = await dynamo.send(new ScanCommand({ TableName: config.tableName }));
      return (result.Items ?? []).map(itemToRecord).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
    async isReady() {
      try {
        await sqs.send(new GetQueueAttributesCommand({ QueueUrl: config.queueUrl, AttributeNames: ['QueueArn'] }));
        return true;
      } catch {
        return false;
      }
    },
  };
}
