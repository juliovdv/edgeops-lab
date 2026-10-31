import { DynamoDBClient, GetItemCommand, PutItemCommand, type AttributeValue } from '@aws-sdk/client-dynamodb';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import type { EventRecord } from '../../../packages/contracts/src/event.js';
import { createHandler, type SQSEvent } from './handler.js';

const endpoint = process.env.LOCALSTACK_ENDPOINT ?? 'http://localstack:4566';
const region = process.env.AWS_REGION ?? 'us-east-1';
const tableName = process.env.EVENTS_TABLE_NAME ?? 'edgeops-events-table';
const bucketName = process.env.EVIDENCE_BUCKET_NAME ?? 'edgeops-evidence';
const clientConfig = {
  endpoint,
  region,
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
};
const dynamo = new DynamoDBClient(clientConfig);
const s3 = new S3Client({ ...clientConfig, forcePathStyle: true });

function toItem(record: EventRecord): Record<string, AttributeValue> {
  const item: Record<string, AttributeValue> = {
    id: { S: record.id },
    type: { S: record.type },
    correlationId: { S: record.correlationId },
    payload: { S: JSON.stringify(record.payload) },
    status: { S: record.status },
    createdAt: { S: record.createdAt },
    updatedAt: { S: record.updatedAt },
  };

  if (record.errorReason) item.errorReason = { S: record.errorReason };
  if (record.evidenceKey) item.evidenceKey = { S: record.evidenceKey };
  return item;
}

function fromItem(item: Record<string, AttributeValue> | undefined): EventRecord | undefined {
  if (!item) return undefined;
  return {
    id: item.id?.S ?? '',
    type: item.type?.S as EventRecord['type'],
    correlationId: item.correlationId?.S ?? '',
    payload: JSON.parse(item.payload?.S ?? '{}') as Record<string, unknown>,
    status: item.status?.S as EventRecord['status'],
    createdAt: item.createdAt?.S ?? '',
    updatedAt: item.updatedAt?.S ?? '',
    errorReason: item.errorReason?.S,
    evidenceKey: item.evidenceKey?.S,
  };
}

export const handler = createHandler({
  async getRecord(id) {
    const result = await dynamo.send(new GetItemCommand({ TableName: tableName, Key: { id: { S: id } } }));
    return fromItem(result.Item);
  },
  async putRecord(record) {
    await dynamo.send(new PutItemCommand({ TableName: tableName, Item: toItem(record) }));
  },
  async putEvidence(key, record) {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: JSON.stringify(record),
        ContentType: 'application/json',
      }),
    );
  },
  now: () => new Date().toISOString(),
});

export type LambdaEvent = SQSEvent;
