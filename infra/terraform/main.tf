terraform {
  required_version = ">= 1.17.0"

  required_providers {
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region                      = var.aws_region
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style           = true

  endpoints {
    dynamodb = var.localstack_endpoint
    iam      = var.localstack_endpoint
    lambda   = var.localstack_endpoint
    s3       = var.localstack_endpoint
    sqs      = var.localstack_endpoint
    sts      = var.localstack_endpoint
  }
}

data "archive_file" "processor" {
  type        = "zip"
  source_file = "../../dist/processor/index.mjs"
  output_path = var.lambda_zip_path
}

resource "aws_sqs_queue" "events_dlq" {
  name = "edgeops-events-dlq"
}

resource "aws_sqs_queue" "events" {
  name                       = "edgeops-events"
  visibility_timeout_seconds = 30
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.events_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_dynamodb_table" "events" {
  name         = "edgeops-events-table"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

resource "aws_s3_bucket" "evidence" {
  bucket        = "edgeops-evidence"
  force_destroy = true
}

resource "aws_iam_role" "processor" {
  name = "edgeops-processor-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "processor" {
  name = "edgeops-processor-policy"
  role = aws_iam_role.processor.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem"]
        Resource = aws_dynamodb_table.events.arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "${aws_s3_bucket.evidence.arn}/*"
      },
    ]
  })
}

resource "aws_lambda_function" "processor" {
  function_name    = "edgeops-processor"
  role             = aws_iam_role.processor.arn
  handler          = "index.handler"
  runtime          = "nodejs24.x"
  architectures    = ["arm64"]
  filename         = data.archive_file.processor.output_path
  source_code_hash = data.archive_file.processor.output_base64sha256
  timeout          = 20
  memory_size      = 256

  environment {
    variables = {
      LOCALSTACK_ENDPOINT = "http://localhost.localstack.cloud:4566"
      EVENTS_TABLE_NAME   = aws_dynamodb_table.events.name
      EVIDENCE_BUCKET_NAME = aws_s3_bucket.evidence.bucket
    }
  }
}

resource "aws_lambda_event_source_mapping" "events" {
  event_source_arn = aws_sqs_queue.events.arn
  function_name    = aws_lambda_function.processor.arn
  batch_size       = 1
}
