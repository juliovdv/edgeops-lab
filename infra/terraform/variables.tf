variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "localstack_endpoint" {
  type    = string
  default = "http://localstack:4566"
}

variable "lambda_zip_path" {
  type    = string
  default = "../../dist/processor.zip"
}
