#!/usr/bin/env python3

import json
import subprocess
import sys

MFA_SERIAL_NUMBER = "arn:aws:iam::211125488712:mfa/rifat-hp-craftsmen"
DURATION_SECONDS = 43200  # 12 hours

def main():
    # Prompt for MFA token (to stderr so it doesn't interfere with eval)
    sys.stderr.write("Enter your MFA token: ")
    sys.stderr.flush()
    mfa_token = input().strip()

    if not mfa_token:
        print("Error: MFA token cannot be empty", file=sys.stderr)
        sys.exit(1)

    sys.stderr.write("Getting session token...\n")
    sys.stderr.flush()

    try:
        # Call AWS STS to get session token
        result = subprocess.run([
            "aws", "sts", "get-session-token",
            "--serial-number", MFA_SERIAL_NUMBER,
            "--token-code", mfa_token,
            "--duration-seconds", str(DURATION_SECONDS)
        ], capture_output=True, text=True, check=True)

        response = json.loads(result.stdout)

        # Extract credentials
        access_key_id = response["Credentials"]["AccessKeyId"]
        secret_access_key = response["Credentials"]["SecretAccessKey"]
        session_token = response["Credentials"]["SessionToken"]
        expiration = response["Credentials"]["Expiration"]

        # Output shell export commands to stdout (for eval)
        print(f'export AWS_ACCESS_KEY_ID="{access_key_id}"')
        print(f'export AWS_SECRET_ACCESS_KEY="{secret_access_key}"')
        print(f'export AWS_SESSION_TOKEN="{session_token}"')

        # Print success message to stderr
        print(f"\n✓ AWS Session created successfully!", file=sys.stderr)
        print(f"Session expires at: {expiration}", file=sys.stderr)

    except subprocess.CalledProcessError as e:
        print("Error: Failed to get session token", file=sys.stderr)
        print(e.stderr, file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError:
        print("Error: Failed to parse AWS response", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
