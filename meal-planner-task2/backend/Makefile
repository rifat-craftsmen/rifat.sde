ECR_REGISTRY = 211125488712.dkr.ecr.ap-southeast-1.amazonaws.com
ECR_REPO     = trainee-rifat-mhpv2-backend
IMAGE_URI    = $(ECR_REGISTRY)/$(ECR_REPO):latest
MFA_ARN      = arn:aws:iam::211125488712:mfa/rifat-hp-craftsmen

LAMBDA_DISCORD      = trainee-2026-rifat-discord-lambda-v2
LAMBDA_GOOGLE       = trainee-2026-rifat-google-lambda-v2
LAMBDA_CRON         = trainee-2026-rifat-cron-lambda-v2
LAMBDA_DISCORD_AUTH = trainee-2026-rifat-discord-authorizer-v2
LAMBDA_GOOGLE_AUTH  = trainee-2026-rifat-google-authorizer-v2

.PHONY: build push deploy

build:
	npm run build
	docker build --platform linux/amd64 --provenance=false -t $(ECR_REPO) .
	docker tag $(ECR_REPO):latest $(IMAGE_URI)

push:
	@read -p "Enter MFA code: " code; \
	creds=$$(aws sts get-session-token --serial-number $(MFA_ARN) --token-code $$code --query 'Credentials' --output json); \
	AWS_ACCESS_KEY_ID=$$(echo $$creds | python -c "import sys,json; print(json.load(sys.stdin)['AccessKeyId'])") \
	AWS_SECRET_ACCESS_KEY=$$(echo $$creds | python -c "import sys,json; print(json.load(sys.stdin)['SecretAccessKey'])") \
	AWS_SESSION_TOKEN=$$(echo $$creds | python -c "import sys,json; print(json.load(sys.stdin)['SessionToken'])") \
	sh -c ' \
		aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin $(ECR_REGISTRY) && \
		docker push $(IMAGE_URI) && \
		aws lambda update-function-code --function-name $(LAMBDA_DISCORD)      --image-uri $(IMAGE_URI) --region ap-southeast-1 && \
		aws lambda update-function-code --function-name $(LAMBDA_GOOGLE)       --image-uri $(IMAGE_URI) --region ap-southeast-1 && \
		aws lambda update-function-code --function-name $(LAMBDA_CRON)         --image-uri $(IMAGE_URI) --region ap-southeast-1 && \
		aws lambda update-function-code --function-name $(LAMBDA_DISCORD_AUTH) --image-uri $(IMAGE_URI) --region ap-southeast-1 && \
		aws lambda update-function-code --function-name $(LAMBDA_GOOGLE_AUTH)  --image-uri $(IMAGE_URI) --region ap-southeast-1 \
	'

deploy: build push
