output "events_queue_url" {
  value = aws_sqs_queue.events.id
}

output "events_table_name" {
  value = aws_dynamodb_table.events.name
}

output "evidence_bucket_name" {
  value = aws_s3_bucket.evidence.bucket
}
