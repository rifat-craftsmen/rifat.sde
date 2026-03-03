## Meal Headcount Planner Technical Document
- Author: Rifat Ahmed
- Task: 2
- Iteration: 1
- Version: v1

---

## Summary

This document introduces a discord based Meal Headcount Planner system. Employees update their meal choices and work-from-home status through slash commands without leaving the platform the team already uses throughout the day. Leads and admins get the same real-time visibility — employee participation, headcounts, and overrides — through the same interface. Records are prepared automatically each night, so employees only need to act when their plans differ from the default.

---

## Problem Statement

- Employees had to leave Discord and open a separate web application to record their daily meal preferences.
- Team Leads and Admins had no way to check headcounts or participation without switching to that external tool — an unnecessary interruption during busy periods.
- Running a standalone web application added maintenance overhead that was difficult to justify when Discord was already the team's central hub for communication and coordination.

---



## Goals and Non-Goals

### Goals
- Discord slash commands for employees to view their 7-day schedule and update meal choices and WFH status.
- Slash commands for Team Leads to view per-employee daily participation, and override employee choices.
- Slash commands for Admins to manage meal schedules, company-wide WFH periods, headcount, and bulk updates.
- Serverless backend on AWS Lambda exposed via Lambda Function URL (no API Gateway).
- Nightly cron job (EventBridge at 9 PM) that pre-creates tomorrow's records for all active users.
- DynamoDB as the sole data store — access-pattern-first design.
- User management via YAML files and a sync script.

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
- Employees view their 7-day meal schedule, including which meal types are available on each date and their current selections.
- Employees create a meal record for a date within the valid window.
- Employees update their meal choices and work-from-home status for any date within the valid window.
- Employees are blocked from editing records outside the valid window (today is locked; past dates and dates beyond 6 days ahead are rejected).

**Team Lead**
- Team Leads view their own team's participation, including each member's name, status, and monthly WFH count.
- Team Leads view a team member's 7-day schedule and current meal selections.
- Team Leads view per-employee meal participation detail for a specific date across their team.
- Team Leads create or override a team member's meal record for a date.
- Team Leads apply a bulk action across all members of their team for a date.
- Team Lead operations are strictly scoped to their own team — actions on members of other teams are rejected.

**Admin**
- Admins create a meal schedule for a date, specifying which meal types are enabled and an optional occasion name.
- Admins view all upcoming meal schedules.
- Admins delete a meal schedule for a date.
- Admins create a company-wide WFH period with a date range and optional note.
- Admins view all active WFH periods.
- Admins delete a WFH period.
- Admins view the daily headcount for a date: total meal counts, team-by-team breakdown, and office vs WFH split.
- Admins view per-employee meal participation for a date across all teams.
- Admin apply a bulk action across all members for a date.
- Admins perform all Team Lead actions without team scope restriction.

**Nightly Automation**
- The system automatically creates tomorrow's meal records each night for all active users.
- Records are pre-filled using the published schedule for that date
- If a user has already submitted a record for that date, only null meal fields are filled in — confirmed choices are never overwritten.

**User Management**
- User and team data is managed through YAML files and a sync script; no API endpoints exist for user CRUD.
- The sync script creates or updates user profiles, deactivates removed users, and keeps team members and the active user list in sync.

### Validation Rules
- Date must be in `YYYY-MM-DD` format.
- Meal update dates must be within the 7-day valid window (today + 6 days).
- Schedule creation date must be at least tomorrow.
- `dateTo` must be ≥ `dateFrom` for global WFH periods.
- `bulkUpdate`, `userIds` must be a non-empty array of strings.

---



## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript / Node.js 20 | Type safety across bot and backend; single language reduces context-switching |
| Bot library | `@discordjs/rest` + `discord-interactions` | REST client for command registration; `discord-interactions` for Ed25519 signature verification on the interactions endpoint |
| Backend framework | Express.js | Minimal overhead; reused unchanged between local dev and Lambda |
| Lambda adapter | `@vendia/serverless-express` | Wraps Express for Lambda with zero code changes to the app itself |
| Deployment | AWS Lambda Function URL | No API Gateway cost (~$3.50/M requests) or configuration; direct HTTPS URL for a single known client |
| Database | Amazon DynamoDB | Serverless, PAY_PER_REQUEST billing |
| Local DB | DynamoDB Local via Docker | Identical API to AWS; no cloud credentials needed during development |
| Build | esbuild | Bundles TypeScript + dependencies to a single ~3–5 MB file; `--external:@aws-sdk` excludes the SDK already present in Lambda runtime, reducing upload from ~150 MB to ~5 MB |

---

## Architecture Overview


Discord uses the **Interactions Endpoint** model instead of a WebSocket gateway. When a user runs a slash command, Discord sends a POST to the configured Lambda Function URL. No always-on process is needed.

```
Discord User
  │  slash command
  ▼
Discord
  │  POST /discord/interactions  (Ed25519 signed)
  ▼
API Lambda
  │  [1] verify Ed25519 signature        
  │  [2] resolve discordId → userId       
  │  [3] map Discord role IDs → app role 
  │  [4] check command role requirement for authorization 
  │  [5] execute command handler          
  ▼
Discord  (delivers interaction response to user)

─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

EventBridge Scheduler  (9 PM BST)
  │  invoke
  ▼
Cron Lambda
  │  BatchWrite
  ▼
DynamoDB
```




Two independently deployable Lambda functions. No persistent bot process. 

| Component | Runtime | Trigger |
|-----------|---------|---------|
| API Lambda | AWS Lambda, Node.js 20, arm64 | Lambda Function URL (HTTPS) — handles both API routes and Discord interactions endpoint |
| Cron Lambda | AWS Lambda, Node.js 20, arm64 | EventBridge Scheduler, 9 PM BST daily |


The Express app (`app.ts`) has no awareness of Lambda. `lambda.ts` wraps it with `@vendia/serverless-express` and exports the handler. The same `app.ts` is imported by `server.ts` for local `app.listen()` development. No code diverges between environments.


---


## Database Design

Four DynamoDB tables. **2 GSIs total** — both on `mealPlanner`.

### mealPlanner (3 item types)

**UserProfile** — `PK: USER#{userId}` · `SK: PROFILE`
- `userId`, `name`, `email`, `discordId`, `role`, `status`
- `teamId`, `teamName` (denormalized from teams)
- `wfhCount`, `wfhMonth` (monthly WFH counter, resets each month)
- `gsi1pk: discordId` → discordId-index

**MealRecord** — `PK: USER#{userId}` · `SK: RECORD#{YYYY-MM-DD}`
- `lunch`, `snacks`, `iftar`, `eventDinner`, `optionalDinner` (`boolean | null`)
- `workFromHome` (`boolean`)
- `teamId`, `teamName` (denormalized for headcount grouping)
- `lastModifiedBy`
- `gsi2pk: RECORD#{date}` → date-records-index

**Active User List** — `PK: SYSTEM` · `SK: ACTIVE_USERS`
- `memberIds: StringSet` — all active userIds; read by cron each night to avoid a full table scan

**GSIs**

| Index | PK | SK |
|-------|----|----|
| `discordId-index` | `gsi1pk` (discordId) | `SK` |
| `date-records-index` | `gsi2pk` (RECORD#{date}) | `PK` |

### mealSchedules

`PK: date (YYYY-MM-DD)`
- `lunchEnabled`, `snacksEnabled`, `iftarEnabled`, `eventDinnerEnabled`, `optionalDinnerEnabled`
- `occasionName` (optional), `createdBy`

### teams

`PK: teamId`
- `name`, `leadId`
- `memberIds: StringSet` (active member userIds)

### globalWfhPeriods

`PK: 'WFH'` · `SK: id (UUID)` — Query PK='WFH' returns all periods in one call; no GSI needed.
- `dateFrom`, `dateTo` (YYYY-MM-DD)
- `note` (optional), `createdBy`

### Access Patterns

| Pattern | Operation |
|---------|-----------|
| **mealPlanner** | |
| Auth: discordId → userId | Query `discordId-index` (`gsi1pk=discordId`, `SK=PROFILE`) |
| Get user profile | GetItem `PK=USER#{userId}`, `SK=PROFILE` |
| Get user's single meal record | GetItem `PK=USER#{userId}`, `SK=RECORD#{date}` |
| User's 7-day records | Query `PK=USER#{userId}`, SK BETWEEN `RECORD#{today}` AND `RECORD#{+6d}` |
| Upsert meal record | PutItem `PK=USER#{userId}`, `SK=RECORD#{date}` |
| Update WFH counter on profile | UpdateItem `PK=USER#{userId}`, `SK=PROFILE` ADD `wfhCount` |
| All records for a date (headcount) | Query `date-records-index` (`gsi2pk=RECORD#{date}`) |
| All active users (cron) | GetItem `PK=SYSTEM`, `SK=ACTIVE_USERS` → BatchGetItem profiles |
| **mealSchedules** | |
| Create schedule | PutItem `PK=date` |
| Get schedule for a date | GetItem `PK=date` |
| Delete schedule | DeleteItem `PK=date` |
| List upcoming schedules | Scan with filter `date ≥ today` *(low volume — at most ~30 items ever exist)* |
| **teams** | |
| Get team + member list | GetItem `PK=teamId` |
| Team member profiles | GetItem `teams PK=teamId` → memberIds → BatchGetItem profiles |
| Update team membership | UpdateItem `PK=teamId` ADD/DELETE `memberIds` |
| **globalWfhPeriods** | |
| List all WFH periods | Query `PK='WFH'` |
| Create WFH period | PutItem `PK='WFH'`, `SK={uuid}` |
| Delete WFH period | DeleteItem `PK='WFH'`, `SK={uuid}` |

---

