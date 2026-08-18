# SNS/SQS Message Processing System

Serverless AWS infrastructure that receives JSON messages from SQS, routes them based on a message attribute, stores valid messages in DynamoDB, and emails admins about bad or failed messages.

**Region:** Singapore (ap-southeast-1)  
**Resource prefix:** `trainee-rifat-`

---

## Architecture

```
SQS Queue
  └─ EventBridge Pipe (batch: 5, REQUEST_RESPONSE)
       └─ Step Function (Express)
            ├─ type="good"           → DynamoDB
            ├─ type="bad"            → SNS → email
            └─ missing/invalid type  → SNS → email

Retry / failure path:
  SQS retries failed message after 30s
  After 2 failures → DLQ
  DLQ → EventBridge Pipe (batch: 1) → SNS → email (message deleted from DLQ after send)
```

### AWS Resources

| Resource | Name |
|---|---|
| SQS Queue | `trainee-rifat-message-processor-queue` |
| SQS DLQ | `trainee-rifat-message-processor-dlq` |
| EventBridge Pipe (main) | `trainee-rifat-message-processor-sqs-to-sf` |
| EventBridge Pipe (DLQ) | `trainee-rifat-message-processor-dlq-to-sns` |
| Step Function | `trainee-rifat-message-processor-processor` |
| DynamoDB Table | `trainee-rifat-message-processor-messages` |
| SNS (bad messages) | `trainee-rifat-message-processor-bad-message-notifications` |
| SNS (DLQ alerts) | `trainee-rifat-message-processor-dlq-notifications` |

---

## Message Format

**Body** (JSON string):
```json
{ "id": 1, "content": "your message" }
```

**Message attribute** `type` (String): `"good"` or `"bad"`

> The `type` field is a **message attribute**, not part of the body.

---

## Deploy

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Set admin_email in terraform.tfvars

terraform init
terraform apply
```

After apply, check inbox and **confirm both SNS subscription emails** before testing — emails won't arrive until confirmed.

---

## Send Test Messages

```bash
QUEUE_URL=$(terraform output -raw sqs_main_queue_url)

# Good message → stored in DynamoDB
aws sqs send-message \
  --queue-url $QUEUE_URL \
  --message-body '{"id": 1, "content": "hello"}' \
  --message-attributes '{"type": {"DataType": "String", "StringValue": "good"}}' \
  --region ap-southeast-1

# Bad message → email alert
aws sqs send-message \
  --queue-url $QUEUE_URL \
  --message-body '{"id": 2, "content": "hello"}' \
  --message-attributes '{"type": {"DataType": "String", "StringValue": "bad"}}' \
  --region ap-southeast-1

# Missing type attribute → email alert
aws sqs send-message \
  --queue-url $QUEUE_URL \
  --message-body '{"id": 3, "content": "hello"}' \
  --region ap-southeast-1

# Invalid body (triggers retry → DLQ → email after ~60s)
aws sqs send-message \
  --queue-url $QUEUE_URL \
  --message-body 'NOT JSON' \
  --message-attributes '{"type": {"DataType": "String", "StringValue": "good"}}' \
  --region ap-southeast-1
```

---

## Verify Results

```bash
cd terraform

# Check DynamoDB for stored good messages
aws dynamodb scan \
  --table-name $(terraform output -raw dynamodb_table_name) \
  --region ap-southeast-1

# Check DLQ message count
aws sqs get-queue-attributes \
  --queue-url $(terraform output -raw sqs_dlq_url) \
  --attribute-names ApproximateNumberOfMessages \
  --region ap-southeast-1
```

---

## Logs

| What | Where |
|---|---|
| Pipe (main) execution details | CloudWatch → `/aws/pipes/trainee-rifat-message-processor-sqs-to-sf` |
| Pipe (DLQ) execution details | CloudWatch → `/aws/pipes/trainee-rifat-message-processor-dlq-to-sns` |
| Step Function state transitions | CloudWatch → `/aws/states/trainee-rifat-message-processor-processor` |

> Step Function executions are **not** visible in the SF console (Express workflow) — CloudWatch logs are the only view.

---

## Configuration

Edit `terraform/terraform.tfvars`:

| Variable | Default | Description |
|---|---|---|
| `admin_email` | — | **Required.** Email for all SNS alerts |
| `aws_region` | `ap-southeast-1` | AWS region |
| `sqs_visibility_timeout` | `30` | Seconds before a failed message is retried |
| `max_receive_count` | `2` | Failures before message moves to DLQ |
| `eventbridge_batch_size` | `5` | Messages per SF invocation (max 10) |

---

## Cost Estimate

All resources are pay-per-use. No idle cost.

| Service | Pricing |
|---|---|
| SQS | $0.40 / million requests |
| EventBridge Pipe | $0.35 / DPU-hour |
| Step Functions (Express) | $1.00 / million executions + $0.00001 / state transition |
| DynamoDB | $1.25 / million write units |
| SNS | $0.50 / million notifications |

---

## Cleanup

```bash
cd terraform
terraform destroy
```
