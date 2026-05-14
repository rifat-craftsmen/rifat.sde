resource "aws_iam_role" "step_function_role" {
  name = "${var.project_name}-step-function-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "states.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "step_function_dynamodb" {
  name = "${var.project_name}-step-function-dynamodb"
  role = aws_iam_role.step_function_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem"]
        Resource = aws_dynamodb_table.messages.arn
      }
    ]
  })
}

resource "aws_iam_role_policy" "step_function_sns" {
  name = "${var.project_name}-step-function-sns"
  role = aws_iam_role.step_function_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["sns:Publish"]
        Resource = [
          aws_sns_topic.bad_message_notifications.arn,
          aws_sns_topic.dlq_notifications.arn
        ]
      }
    ]
  })
}

resource "aws_sfn_state_machine" "message_processor" {
  name     = "${var.project_name}-processor"
  role_arn = aws_iam_role.step_function_role.arn
  type     = "EXPRESS" # REQUEST_RESPONSE pipe invocation requires Express workflow

  # EventBridge Pipe delivers SQS messages as an array (batch).
  # The Map state iterates each message individually.
  # Body arrives as a raw JSON string so States.StringToJson is required before
  # accessing id/content.
  definition = jsonencode({
    Comment = "Process SQS message batch from EventBridge Pipe"
    StartAt = "ProcessBatch"
    States = {
      ProcessBatch = {
        Type          = "Map"
        ItemsPath     = "$"
        MaxConcurrency = 0
        ItemProcessor = {
          ProcessorConfig = {
            Mode = "INLINE"
          }
          StartAt = "CheckTypeAttributePresent"
          States = {

            # Guard: check $.messageAttributes.type exists before reading its value.
            CheckTypeAttributePresent = {
              Type = "Choice"
              Choices = [
                {
                  Variable  = "$.messageAttributes.type"
                  IsPresent = false
                  Next      = "SendBadMessageNotification"
                }
              ]
              Default = "CheckMessageType"
            }

            CheckMessageType = {
              Type = "Choice"
              Choices = [
                {
                  Variable     = "$.messageAttributes.type.stringValue"
                  StringEquals = "good"
                  Next         = "ParseBody"
                },
                {
                  Variable     = "$.messageAttributes.type.stringValue"
                  StringEquals = "bad"
                  Next         = "SendBadMessageNotification"
                }
              ]
              Default = "SendBadMessageNotification"
            }

            # Parse the body string into an object so id/content are accessible.
            ParseBody = {
              Type = "Pass"
              Parameters = {
                "messageAttributes.$" = "$.messageAttributes"
                "parsedBody.$"        = "States.StringToJson($.body)"
              }
              Next = "StoreGoodMessage"
            }

            StoreGoodMessage = {
              Type     = "Task"
              Resource = "arn:aws:states:::dynamodb:putItem"
              Parameters = {
                TableName = aws_dynamodb_table.messages.name
                Item = {
                  id = {
                    # DynamoDB N type requires a string representation of the number.
                    "N.$" = "States.Format('{}', $.parsedBody.id)"
                  }
                  content = {
                    "S.$" = "$.parsedBody.content"
                  }
                  type = {
                    S = "good"
                  }
                  processedAt = {
                    "S.$" = "$$.State.EnteredTime"
                  }
                }
              }
              Next = "MessageProcessed"
              Catch = [
                {
                  ErrorEquals = ["States.ALL"]
                  Next        = "ProcessingError"
                }
              ]
            }

            SendBadMessageNotification = {
              Type     = "Task"
              Resource = "arn:aws:states:::sns:publish"
              Parameters = {
                TopicArn  = aws_sns_topic.bad_message_notifications.arn
                Subject   = "Bad or Invalid Message Received"
                "Message.$" = "$.body"
              }
              Next = "MessageProcessed"
            }

            ProcessingError = {
              Type  = "Fail"
              Error = "ProcessingFailed"
              Cause = "DynamoDB write error"
            }

            MessageProcessed = {
              Type = "Succeed"
            }
          }
        }
        Next = "BatchProcessed"
      }

      BatchProcessed = {
        Type = "Succeed"
      }
    }
  })

  logging_configuration {
    level                  = "ALL"
    include_execution_data = true
    log_destination        = "${aws_cloudwatch_log_group.sf_logs.arn}:*"
  }

  tags = {
    Name = "${var.project_name}-step-function"
  }

  depends_on = [aws_iam_role_policy.step_function_logs]
}
