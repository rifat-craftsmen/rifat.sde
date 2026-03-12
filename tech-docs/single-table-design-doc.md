## DynamoDB Single Table Design — Access Patterns & Schema

**Table name:** `mealPlanner`
**GSIs:** 0 (zero — all access patterns served via primary keys and sentinel items)

---

## Entity Types

### 1. User Profile

#### Access Patterns

1. **Get user profile by Discord ID**
   GetItem `PK: USER#{discordId}` `SK: PROFILE`

2. **Update user's WFH counter for the month**
   UpdateItem `PK: USER#{discordId}` `SK: PROFILE`

3. **Batch get multiple user profiles**
   BatchGetItem with multiple `PK: USER#{discordId}` `SK: PROFILE`

#### DB Schema

**PK:** `USER#{discordId}`
**SK:** `PROFILE`

**Attributes:**
- `discordId` (String) — Discord snowflake ID
- `name` (String) — User's full name
- `email` (String) — User's email address
- `role` (String) — ADMIN | LEAD | LOGISTICS | EMPLOYEE
- `status` (String) — ACTIVE | INACTIVE
- `teamId` (String) — Unique team identifier
- `teamName` (String) — Denormalized team name
- `wfhCount` (Number) — WFH days used in current month
- `wfhMonth` (String) — YYYY-MM, resets monthly
- `createdAt` (String) — ISO 8601 timestamp
- `updatedAt` (String) — ISO 8601 timestamp

**Schema Conventions:**
- `USER#` prefix identifies user partition
- Discord ID is the sole primary identifier — no internal userId concept
- Direct GetItem access; no GSI needed

---

### 2. Meal Record

#### Access Patterns

1. **Get user's single meal record for a specific date**
   GetItem `PK: USER#{discordId}` `SK: RECORD#{YYYY-MM-DD}`

2. **Get user's next 7 weekday meal records (Mon–Fri, weekends excluded)**
   Query `PK: USER#{discordId}` `SK BETWEEN RECORD#{startDate} AND RECORD#{endDate}`
   _(startDate = today, endDate = calendar date that spans 7 weekdays — up to +11 days)_

3. **Create or update meal record for a user**
   PutItem / UpdateItem `PK: USER#{discordId}` `SK: RECORD#{YYYY-MM-DD}`

4. **Get all meal records for a specific date (headcount)**
   GetItem `PK: SYSTEM` `SK: ACTIVE_USERS` → get all discordIds
   BatchGetItem `PK: USER#{discordId}` `SK: RECORD#{date}` for each active user

5. **Batch create meal records (nightly cron job)**
   BatchWriteItem with multiple `PK: USER#{discordId}` `SK: RECORD#{YYYY-MM-DD}`

6. **Get team members' meal records for a specific date (work location view)**
   GetItem `PK: TEAM#{teamId}` `SK: METADATA` → get memberIds
   BatchGetItem `PK: USER#{discordId}` `SK: RECORD#{date}` for each member

#### DB Schema

**PK:** `USER#{discordId}`
**SK:** `RECORD#{YYYY-MM-DD}`

**Attributes:**
- `lunch` (Boolean | null) — Opted into lunch; null = not set
- `snacks` (Boolean | null) — Opted into snacks; null = not set
- `iftar` (Boolean | null) — Opted into iftar; null = not set
- `eventDinner` (Boolean | null) — Opted into event dinner; null = not set
- `optionalDinner` (Boolean | null) — Opted into optional dinner; null = not set
- `workFromHome` (Boolean) — Working from home flag; always set, never null
- `teamId` (String) — Denormalized for headcount grouping
- `teamName` (String) — Denormalized for headcount grouping
- `createdAt` (String) — ISO 8601 timestamp
- `updatedAt` (String) — ISO 8601 timestamp

**Schema Conventions:**
- `RECORD#` prefix + date as SK enables range queries for weekday views
- Meal fields are nullable to distinguish "not set" from "opted out"
- `workFromHome` is always boolean (never null)
- Full mutation history is in AuditLog — no `lastModifiedBy` field needed here

---
