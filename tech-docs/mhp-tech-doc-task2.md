## Meal Headcount Planner Technical Document
- Author: Rifat Ahmed
- Task: 2
- Iteration: 1
- Version: v2

---

## Summary

This document introduces a Discord-based Meal Headcount Planner system. Employees update their meal choices and work-from-home status through slash commands without leaving the platform the team already uses throughout the day. Leads and admins get the same real-time visibility — employee participation, headcounts, and overrides — through the same interface. Records are prepared automatically each night, so employees only need to act when their plans differ from the default.

---

## Problem Statement

- Employees had to leave Discord and open a separate web application to record their daily meal preferences.
- Team Leads and Admins had no way to check headcounts or participation without switching to that external tool — an unnecessary interruption during busy periods.
- Running a standalone web application added maintenance overhead that was difficult to justify when Discord was already the team's central hub for communication and coordination.

---

## Goals and Non-Goals

### Goals
- Discord slash commands for employees to view their 7-day weekday schedule and update meal choices and WFH status.
- Slash commands for Team Leads to view per-employee daily participation, and override employee choices.
- Slash commands for Admins to manage meal schedules, company-wide WFH periods, headcount, and bulk updates.
- Serverless backend on AWS Lambda exposed via API Gateway HTTP API.
- Nightly cron job (EventBridge at 9 PM BST) that pre-creates tomorrow's records for all active users.
- Morning cron job (EventBridge at 9 AM BST) that posts a headcount report to a Discord channel via webhook.
- DynamoDB as the sole data store — single table, zero GSIs, access-pattern-first design.
- User management via YAML files and a sync script.
- Weekends (Saturday and Sunday) are excluded from all schedule and meal record operations.

### Non-Goals
- Web frontend or dashboard of any kind.
- JWT authentication or login/register endpoints.
- Manual user CRUD via API — users are managed through `users.yaml` and the sync script.
- Monthly employee statistics — excluded from this iteration.
- Automated ordering to logistics — tracking only.

---

## Requirements

### Functional Requirements

**Employee**
- Employees view their 7-day meal schedule (weekdays only, Mon–Fri), including which meal types are available on each date and their current selections.
- Employees create a meal record for a date within the valid window.
- Employees update their meal choices and work-from-home status for any date within the valid window.
- Employees are blocked from editing records outside the valid window (today is locked; past dates, weekends, and dates beyond the 7-weekday window are rejected).

**Team Lead**
- Team Leads view their own team's participation, including each member's name, status, and monthly WFH count.
- Team Leads view a team member's 7-day schedule and current meal selections.
- Team Leads view per-employee meal participation detail for a specific date across their team.
- Team Leads create or override a team member's meal record for a date.
- Team Leads apply a bulk action across all members of their team for a date.
- Team Lead operations are strictly scoped to their own team — actions on members of other teams are rejected.

**Admin**
- Admins create a meal schedule for a weekday date, specifying which meal types are enabled and an optional occasion name.
- Admins view all upcoming meal schedules.
- Admins update a meal schedule for a date.
- Admins delete a meal schedule for a date.
- Admins create a company-wide WFH period with a date range and optional note.
- Admins view all active WFH periods.
- Admins update a WFH period.
- Admins delete a WFH period.
- Admins view the daily headcount for a date: total meal counts, team-by-team breakdown, and office vs WFH split.
- Admins view per-employee meal participation for a date across all teams.
- Admins apply a bulk action across all members for a date.
- Admins perform all Team Lead actions without team scope restriction.

**Nightly Automation**
- The system automatically creates tomorrow's meal records each night for all active users (weekdays only — cron skips Saturday and Sunday).
- Records are pre-filled using the published schedule for that date.
- If a user has already submitted a record for that date, only null meal fields are filled in — confirmed choices are never overwritten.

**Morning Report**
- Each weekday morning the system posts a headcount summary to a configured Discord channel via webhook.
- The report shows total counts per meal type and a breakdown by team.

**User Management**
- User and team data is managed through YAML files and a sync script; no API endpoints exist for user CRUD.
- The sync script creates or updates user profiles, deactivates removed users, and keeps team members and the active user list in sync.

### Validation Rules
- Date must be in `YYYY-MM-DD` format.
- Weekends (Saturday and Sunday) are rejected for all schedule creation and meal record operations.
- Meal update dates must be within the 7-weekday valid window.
- Schedule creation date must be at least tomorrow and must be a weekday.
- `dateTo` must be ≥ `dateFrom` for global WFH periods.
- `bulkUpdate`, `discordIds` must be a non-empty array of strings.

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript / Node.js 22 | Type safety across bot and backend; single language reduces context-switching |
| Bot library | `@discordjs/rest` + `discord-interactions` | REST client for command registration; `discord-interactions` for Ed25519 signature verification on the interactions endpoint |
| Backend framework | Express.js | Minimal overhead; reused unchanged between local dev and Lambda |
| Lambda adapter | `@vendia/serverless-express` | Wraps Express for Lambda with zero code changes to the app itself |
| Deployment | AWS API Gateway HTTP API + Lambda | HTTP API routes all requests to the API Lambda; more reliable than Lambda Function URL for Discord's verification flow |
| Database | Amazon DynamoDB | Serverless, PAY_PER_REQUEST billing, single table with 0 GSIs |
| Build | esbuild | Bundles TypeScript + dependencies to a single file; `--external:@aws-sdk` excludes the SDK already in the Lambda runtime |

---

## Architecture Overview

Discord uses the **Interactions Endpoint** model instead of a WebSocket gateway. When a user runs a slash command, Discord sends a POST to the API Gateway endpoint. No always-on process is needed.

```
Discord User
  │  slash command
  ▼
Discord
  │  POST /discord/interactions  (Ed25519 signed)
  ▼
API Gateway HTTP API
  │  (optional: Lambda Authorizer for signature verification)
  ▼
API Lambda
  │  [1] verify Ed25519 signature 
  │  [2] fetch user profile by discordId  
  │  [3] map Discord guild role IDs → app role  
  │  [4] check command role requirement  
  │  [5] execute command handler
  ▼
Discord  (delivers interaction response to user)

─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

EventBridge  (9 PM BST weekdays)          EventBridge  (9 AM BST weekdays)
  │  { "type": "CREATE_RECORDS" }           │  { "type": "SEND_REPORT" }
  ▼                                         ▼
Cron Lambda ──────────────────────────────────────────
  │  BatchWrite records for tomorrow    │  Aggregate today's records → POST webhook
  ▼                                     ▼
DynamoDB                            Discord channel (via HEADCOUNT_WEBHOOK_URL)
```

Two independently deployable Lambda functions. No persistent bot process.

| Component | Runtime | Trigger |
|-----------|---------|---------|
| API Lambda | AWS Lambda, Node.js 22 | API Gateway HTTP API — handles all Express routes including `/discord/interactions` |
| Cron Lambda | AWS Lambda, Node.js 22 | Two EventBridge rules: evening record creation + morning headcount report |

The Express app (`app.ts`) has no awareness of Lambda. `lambda.ts` wraps it with `@vendia/serverless-express` and exports the handler. The same `app.ts` is imported by `server.ts` for local `app.listen()` development. No code diverges between environments.

### Lambda Authorizer 

API Gateway supports a **Lambda Authorizer** that runs before the main Lambda. The planned approach is to move Ed25519 signature verification into a dedicated authorizer Lambda:

- The authorizer receives the raw request (headers + body) and verifies the Discord signature.
- On success it returns an IAM allow policy; on failure it returns deny (Discord sees 401).
- The main Lambda no longer needs `discordVerify` middleware — user profile lookup (`discordAuth`) stays in the main Lambda.
- No caching benefit since every Discord request has a unique signature (cache TTL = 0).
- Requires a new `authorizer.ts` Lambda and updating API Gateway configuration.

---

## Database Design

One DynamoDB table. **0 GSIs** — all access patterns are served by primary key lookups, range queries, and sentinel items.

**Table name:** `trainee-2026-rifat-mhp-v2`

### Entity Types

| Entity | PK | SK |
|--------|----|----|
| User Profile | `USER#{discordId}` | `PROFILE` |
| Meal Record | `USER#{discordId}` | `RECORD#{YYYY-MM-DD}` |
| Meal Schedule | `SCHEDULE` | `{YYYY-MM-DD}` |
| Team | `TEAM` | `{teamId}` |
| WFH Period | `WFHPERIOD` | `{dateFrom}#{uuid}` |
| Audit Log | `AUDIT#{entityType}#{entityId}` | `{timestamp}#{uuid}` |
| System Sentinel | `SYSTEM` | `ACTIVE_USERS` |

### Sentinel Pattern

Sentinel items in the `SYSTEM` partition act as pre-built indexes to avoid full table scans.

| SK | Contents | Maintained by |
|----|----------|---------------|
| `ACTIVE_USERS` | StringSet of active discordIds | `syncUsers.ts` |

**Rule:** Every write that affects a sentinel must also update the relevant sentinel item in the same operation.

### Key Design Decisions

- `discordId` is the sole user identifier — no internal userId concept.
- Meal record SK `RECORD#{date}` enables BETWEEN range queries for weekday windows without a GSI.
- WFH Period SK `{dateFrom}#{uuid}` makes Query results naturally date-sorted — no GSI needed.
- Audit log SK `{timestamp}#{uuid}` ensures chronological ordering and uniqueness.
- `teamId` and `teamName` are denormalized onto UserProfile and MealRecord to avoid joins.


## Access Patterns 

### User Profile

| #   | Pattern                                    | Key Condition                                                                  |
| :-- | :----------------------------------------- | :----------------------------------------------------------------------------- |
| 1   | Get user profile by Discord ID             | `PK = USER#{discordId}` + `SK = PROFILE`                                       |
| 2   | Update user's WFH counter for the month    | UpdateItem `PK = USER#{discordId}` + `SK = PROFILE`                            |
| 3   | Batch get multiple user profiles           | BatchGetItem with multiple `PK = USER#{discordId}` + `SK = PROFILE`            |

---

### Meal Record

| #   | Pattern                                                | Key Condition                                                                                                                    |
| :-- | :----------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| 4   | Get user's single meal record for a specific date      | `PK = USER#{discordId}` + `SK = RECORD#{YYYY-MM-DD}`                                                                             |
| 5   | Get user's next 7 weekday meal records                 | Query `PK = USER#{discordId}` + `SK BETWEEN RECORD#{startDate} AND RECORD#{endDate}`                                            |
| 6   | Create or update meal record for a user                | PutItem/UpdateItem `PK = USER#{discordId}` + `SK = RECORD#{YYYY-MM-DD}`                                                          |
| 7   | Get all meal records for a specific date (headcount)   | GetItem `PK = SYSTEM` + `SK = ACTIVE_USERS` → BatchGetItem `PK = USER#{discordId}` + `SK = RECORD#{date}` for each active user |
| 8   | Batch create meal records (nightly cron job)           | BatchWriteItem with multiple `PK = USER#{discordId}` + `SK = RECORD#{YYYY-MM-DD}`                                               |
| 9   | Get team members' meal records for a specific date     | GetItem `PK = TEAM` + `SK = {teamId}` → BatchGetItem `PK = USER#{discordId}` + `SK = RECORD#{date}` for each member            |

---

### Meal Schedule

| #   | Pattern                          | Key Condition                                 |
| :-- | :------------------------------- | :-------------------------------------------- |
| 10  | Get schedule for a specific date | GetItem `PK = SCHEDULE` + `SK = {YYYY-MM-DD}` |
| 11  | Create schedule for a date       | PutItem `PK = SCHEDULE` + `SK = {YYYY-MM-DD}` |
| 12  | Update schedule for a date       | UpdateItem `PK = SCHEDULE` + `SK = {YYYY-MM-DD}` |
| 13  | Delete schedule for a date       | DeleteItem `PK = SCHEDULE` + `SK = {YYYY-MM-DD}` |
| 14  | List all upcoming schedules      | Query `PK = SCHEDULE` + `SK >= today`         |

---

### System Sentinel

| #   | Pattern                                      | Key Condition                                                            |
| :-- | :------------------------------------------- | :----------------------------------------------------------------------- |
| 15  | Get all active Discord IDs (cron, headcount) | GetItem `PK = SYSTEM` + `SK = ACTIVE_USERS`                              |
| 16  | Add/remove user from active list             | UpdateItem `PK = SYSTEM` + `SK = ACTIVE_USERS` ADD/DELETE memberIds      |

---

### Team

| #   | Pattern                              | Key Condition                                                                                                                                  |
| :-- | :----------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| 17  | Get team details and member list     | GetItem `PK = TEAM` + `SK = {teamId}`                                                                                                          |
| 18  | Get all team member profiles         | GetItem `PK = TEAM` + `SK = {teamId}` → BatchGetItem `PK = USER#{discordId}` + `SK = PROFILE` for each member                                 |
| 19  | Get all teams with details           | Query `PK = TEAM`                                                                                                                              |
| 20  | Get all users grouped by team        | GetItem `PK = SYSTEM` + `SK = ACTIVE_USERS` → BatchGetItem `PK = USER#{discordId}` + `SK = PROFILE` for all → group by teamId in app          |
| 21  | Update team membership               | UpdateItem `PK = TEAM` + `SK = {teamId}` ADD/DELETE memberIds                                                                                  |

---

### WFH Period

| #   | Pattern                                      | Key Condition                                                                                    |
| :-- | :------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| 22  | List all WFH periods sorted by start date    | Query `PK = WFHPERIOD` (sorted by SK: `{dateFrom}#{uuid}`)                                       |
| 23  | Create WFH period                            | PutItem `PK = WFHPERIOD` + `SK = {dateFrom}#{uuid}`                                              |
| 24  | Update WFH period                            | UpdateItem `PK = WFHPERIOD` + `SK = {dateFrom}#{uuid}`                                           |
| 25  | Delete WFH period                            | DeleteItem `PK = WFHPERIOD` + `SK = {dateFrom}#{uuid}`                                           |
| 26  | Check if a date falls within any WFH period  | Query `PK = WFHPERIOD` → filter in app (dateFrom <= date <= dateTo)                             |

---

### Audit Log

| #   | Pattern                                      | Key Condition                                                                                    |
| :-- | :------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| 27  | Write audit entry on every mutation          | PutItem `PK = AUDIT#{entityType}#{entityId}` + `SK = {timestamp}#{uuid}`                         |
| 28  | Get all changes made to a specific entity    | Query `PK = AUDIT#{entityType}#{entityId}` (sorted chronologically by SK)                        |

---


## Authentication & Authorization

Membership in the organization's Discord server is the identity boundary. No JWT, no session, no login endpoint is used.

### Request Pipeline

Every incoming interaction passes through three middleware layers in order before reaching the command handler:

```
discordVerify  →  discordAuth  →  requireRole  →  command handler
```

### Step 1 — Ed25519 Signature Verification (`discordVerify`)

Every request from Discord is signed with the application's Ed25519 private key. The `discordVerify` middleware:

1. Reads the raw request body as a Buffer (via `express.raw({ type: 'application/json' })`).
2. Extracts `x-signature-ed25519` and `x-signature-timestamp` headers.
3. Calls `verifyKey(body, signature, timestamp, DISCORD_PUBLIC_KEY)` from `discord-interactions`.
4. Returns `401` immediately if signature is missing or invalid.

**PING handling:** Discord sends a type-1 PING to verify the endpoint when the Interactions URL is first configured. After signature verification passes, the middleware returns `{ type: 1 }` immediately for PING requests without proceeding further down the pipeline. This satisfies Discord's 3-second verification window.

The `DISCORD_PUBLIC_KEY` environment variable must match the public key shown in the Discord Developer Portal under the application's General Information.

### Step 2 — Identity & Profile Resolution (`discordAuth`)

After signature verification, the middleware:

1. Extracts `interaction.member.user.id` (the invoking user's Discord snowflake ID) and `interaction.member.roles` (array of Discord guild role ID snowflakes) from the verified payload.
2. Fetches the user profile: GetItem `PK=USER#{discordId}` `SK=PROFILE`.
3. If no profile exists, returns an ephemeral error — the user is not registered.
4. Resolves the application role from the Discord guild roles (see Step 3).
5. Attaches `{ discordId, role, teamId }` to `req.user` for downstream use.

### Step 3 — Role Resolution

Discord guild role IDs are mapped to application roles using environment variables set at deployment time. The check is evaluated in priority order — first match wins:

| Env var | App Role | Capabilities |
|---------|----------|--------------|
| `DISCORD_ROLE_ADMIN` | `ADMIN` | All commands |
| `DISCORD_ROLE_LEAD` | `LEAD` | Team views, record overrides, bulk updates (own team only) |
| `DISCORD_ROLE_LOGISTICS` | `LOGISTICS` | Headcount and participation views |
| _(no match)_ | `EMPLOYEE` | Own schedule and meal updates only |

Priority: ADMIN > LEAD > LOGISTICS > EMPLOYEE. If a user holds multiple qualifying roles, the highest-privilege role is assigned.

Role is intentionally **not** stored in DynamoDB — it is resolved fresh from the Discord guild roles on every request. Role changes in Discord take effect immediately with no sync required.

### Step 4 — Authorization (`requireRole`)

Each command handler is protected by `requireRole(allowedRoles)`. The middleware compares `req.user.role` against the allowed set. If the role is insufficient, it returns an ephemeral error reply to the user.

**Team Lead scope** is enforced separately at the service layer. A Lead's operations (participation view, record overrides, bulk updates) are restricted to users whose `teamId` matches `req.user.teamId`. A Lead cannot act on members of another team even if they hold the correct role — the service layer checks team membership before executing.

---

## User Flows

### Employee

**Viewing their schedule** — An employee runs `/my-schedule`. The backend confirms their identity, fetches their meal records for the next 7 weekdays alongside the published schedules and any active WFH periods for those dates, and returns a personal schedule view as a private reply.

**Creating a record manually** — An employee runs `/create-meal` for a date where they want to set meal choices. The backend creates the record with their specified values and responds privately.

**Updating a meal record** — An employee runs `/update-meal` with a date and their choices (e.g. no lunch, working from home). The backend validates the date is within the editable window (weekdays only), saves the updated record, and adjusts their monthly WFH count if their work location changed. The employee receives a private confirmation.

### Team Lead

**Viewing their team** — A Lead runs `/team-members`. The backend retrieves the team's member list, fetches each member's profile, and returns a private summary showing each member's name, status, and WFH count for the month.

**Viewing a member's schedule** — A Lead runs `/employee-schedule` for a specific team member. The backend confirms the member belongs to the Lead's team, then returns that member's 7-weekday schedule view privately.

**Viewing daily participation** — A Lead runs `/participation` for a date. The backend returns each team member's meal selections and work location for that day as a private reply.

**Overriding a member's record** — A Lead runs `/update-employee-meal` targeting a team member. The backend checks the member belongs to the Lead's team before saving the updated record.

**Bulk update** — A Lead runs `/bulk-update` with an action (e.g. mark all as WFH) for a date. The backend applies the action across every member of their team and responds privately with a confirmation.

### Admin

**Creating a schedule** — An Admin runs `/create-schedule` for a weekday date, selecting which meal types are available and an optional occasion name. The backend rejects weekend dates. The record is saved and a public confirmation is posted to the channel.

**Managing WFH periods** — An Admin runs `/set-wfh-period` with a date range and optional note. The period is saved and a public announcement is posted. Existing periods can be listed with `/list-wfh-periods` or removed with `/delete-wfh-period`.

**Checking headcount** — An Admin or Logistics member runs `/headcount` for a date. The backend reads all active users from the `ACTIVE_USERS` sentinel, batch-fetches their meal records for that day, tallies totals per meal type with a team breakdown and office vs WFH split, and posts the result publicly.

**Viewing full participation** — An Admin runs `/participation` for a date and receives a private per-employee breakdown across all teams, not scoped to a single team like the Lead view.

### Nightly Automation

Each night at 9 PM BST (weekdays only), the cron Lambda runs the `CREATE_RECORDS` job. It fetches all active users from the `ACTIVE_USERS` sentinel and tomorrow's published schedule. For each active user:

- If no record exists for tomorrow: a record is created using the schedule's meal settings. If a company-wide WFH period covers tomorrow, the record is marked as WFH.
- If a record already exists: only fields that are still `null` are filled in. Any choice the employee already confirmed is left untouched.

Each morning at 9 AM BST (weekdays only), the cron Lambda runs the `SEND_REPORT` job. It batch-fetches today's records for all active users, aggregates the counts, and posts the headcount summary to the Discord channel via webhook.

---

## Discord Commands

| Command | Role | Visibility | Description |
|---------|------|------------|-------------|
| `/my-schedule` | All | Ephemeral | View 7-weekday meal schedule and current choices |
| `/create-meal` | All | Ephemeral | Create meal choices and WFH for a date |
| `/update-meal` | All | Ephemeral | Update meal choices and WFH for a date |
| `/create-schedule` | ADMIN | Public | Set meal options for a weekday date |
| `/list-schedules` | ADMIN | Ephemeral | View upcoming schedules |
| `/update-schedule` | ADMIN | Ephemeral | Update meal options for a date |
| `/delete-schedule` | ADMIN | Ephemeral | Remove a date's schedule |
| `/set-wfh-period` | ADMIN | Public | Create a company-wide WFH date range |
| `/list-wfh-periods` | ADMIN | Ephemeral | View active WFH periods |
| `/update-wfh-period` | ADMIN | Ephemeral | Update a WFH period's date range or note |
| `/delete-wfh-period` | ADMIN | Ephemeral | Remove a WFH period |
| `/headcount` | ADMIN, LOGISTICS | Public | Daily meal totals and team breakdown |
| `/participation` | ADMIN, LEAD | Ephemeral | Per-employee meal detail for a date |
| `/team-members` | LEAD | Ephemeral | View own team participation |
| `/employee-schedule` | LEAD | Ephemeral | View a team member's 7-weekday schedule |
| `/create-employee-meal` | ADMIN, LEAD | Ephemeral | Create an employee's record |
| `/update-employee-meal` | ADMIN, LEAD | Ephemeral | Override an employee's record |
| `/bulk-update` | ADMIN, LEAD | Ephemeral | Apply one action to all team members |

Public responses (`/create-schedule`, `/set-wfh-period`, `/headcount`) post embeds visible to the channel. All others are ephemeral.

---

## User Management

No API endpoints for user CRUD. The admin maintains two YAML files:

- `scripts/data/users.yaml` — name, email, discordId, role, status, teamId
- `scripts/data/teams.yaml` — teamId, name, leadId

`npm run users:sync`:
- Creates or updates UserProfile items (`USER#{discordId}/PROFILE`)
- Maintains the `SYSTEM/ACTIVE_USERS` sentinel (ADD active discordIds, DELETE inactive)
- Maintains `memberIds` StringSet on each `TEAM/{teamId}` item
- Deactivates users removed from YAML (status → INACTIVE)

`npm run teams:sync`:
- Creates or updates Team items (`TEAM/{teamId}`)


---

## Cron Jobs

`cronLambda.ts` exports the Lambda handler. Dispatched by `event.type`. Both jobs skip execution on Saturday and Sunday.

### CREATE_RECORDS — Evening (9 PM BST)

Triggered by EventBridge with `{ "type": "CREATE_RECORDS" }`.

1. GetItem `SYSTEM/ACTIVE_USERS` — get `memberIds` StringSet.
2. GetItem `SCHEDULE/{tomorrow}` — may return null.
3. Query `PK=WFHPERIOD` — get all WFH periods; filter for overlap with tomorrow.
4. For each active user:
   - If no `RECORD#{tomorrow}` exists: PutItem with schedule defaults; `workFromHome=true` if a WFH period covers tomorrow.
   - If a record exists: only null meal fields are filled in — confirmed choices are never overwritten.
5. BatchWriteItem in chunks of 25.

### SEND_REPORT — Morning (9 AM BST)

Triggered by EventBridge with `{ "type": "SEND_REPORT" }`.

1. GetItem `SYSTEM/ACTIVE_USERS` — get `memberIds` StringSet.
2. BatchGetItem `USER#{discordId}/RECORD#{today}` for each active user.
3. Aggregate totals per meal type and group by team.
4. POST formatted message to `HEADCOUNT_WEBHOOK_URL` (Discord webhook — no bot token required).

---

## Definition of Done
- `/health` returns `200 OK` from the deployed Lambda.
- Single DynamoDB table provisioned with 0 GSIs; sentinel items present after sync scripts.
- Discord bot registers slash commands and responds correctly in the Discord server.
- All implemented commands verified end-to-end via Discord.
- DynamoDB items verified via AWS console after each write operation.

---

## Testing Approach

No automated test suite this iteration. Testing is manual:

- **Backend:** Run locally with `npm run dev`; use ngrok to expose the interactions endpoint to Discord for live command testing.
- **DynamoDB:** AWS console to inspect item state after each write operation.
- **Discord commands:** Run `npm run deploy` in `discord-bot/` once to register slash commands, then invoke them in the Discord server and verify replies.
- **Cron:** Invoke the cron Lambda directly from the AWS console with `{ "type": "CREATE_RECORDS" }` or `{ "type": "SEND_REPORT" }` as the test event, then verify results in DynamoDB and Discord.

---
