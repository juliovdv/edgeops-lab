import { DescribeTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { GetQueueAttributesCommand, SQSClient } from '@aws-sdk/client-sqs';

const endpoint = process.env.LOCALSTACK_ENDPOINT ?? 'http://localstack:4566';
const region = process.env.AWS_REGION ?? 'us-east-1';
const queueUrl = process.env.EVENTS_QUEUE_URL;
const tableName = process.env.EVENTS_TABLE_NAME ?? 'edgeops-events-table';
const bucketName = process.env.EVIDENCE_BUCKET_NAME ?? 'edgeops-evidence';
const clientConfig = {
  endpoint,
  region,
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
};

if (!queueUrl) {
  throw new Error('EVENTS_QUEUE_URL is required for the integration assertion');
}

await new SQSClient(clientConfig).send(
  new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ['QueueArn'] }),
);
await new DynamoDBClient(clientConfig).send(new DescribeTableCommand({ TableName: tableName }));
await new S3Client(clientConfig).send(new HeadBucketCommand({ Bucket: bucketName }));

console.log('LocalStack resources are reachable');
