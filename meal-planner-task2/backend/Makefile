LAMBDA_DISCORD      = trainee-2026-rifat-discord-lambda-v2
LAMBDA_GOOGLE       = trainee-2026-rifat-google-lambda-v2
LAMBDA_CRON         = trainee-2026-rifat-cron-lambda-v2
LAMBDA_DISCORD_AUTH = trainee-2026-rifat-discord-authorizer-v2

.PHONY: build build-layer deploy

build:
	npm run build

# Run once when deps change; Layer updates go through Terraform thereafter
build-layer:
	cd layer/nodejs && npm install --omit=dev

# Quick local deploy: build then upload zips directly (bypasses Terraform / Jenkins)
# Assumes the Layer already exists (created via Terraform on first deploy)
deploy: build
	zip -j dist/discordLambda.zip      dist/discordLambda.js
	zip -j dist/discordAuthorizer.zip  dist/discordAuthorizer.js
	zip -j dist/googleLambda.zip       dist/googleLambda.js
	zip -j dist/cron.zip               dist/cron.js
	aws lambda update-function-code --function-name $(LAMBDA_DISCORD)      --zip-file fileb://dist/discordLambda.zip      --region ap-southeast-1
	aws lambda update-function-code --function-name $(LAMBDA_GOOGLE)       --zip-file fileb://dist/googleLambda.zip       --region ap-southeast-1
	aws lambda update-function-code --function-name $(LAMBDA_CRON)         --zip-file fileb://dist/cron.zip               --region ap-southeast-1
	aws lambda update-function-code --function-name $(LAMBDA_DISCORD_AUTH) --zip-file fileb://dist/discordAuthorizer.zip  --region ap-southeast-1
