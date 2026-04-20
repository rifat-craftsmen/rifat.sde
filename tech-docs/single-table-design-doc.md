## DynamoDB Single Table Design — Access Patterns & Schema

**Table name:** `mealPlanner`
**GSIs:** 1 — `status-email-index` (GSI PK: `status`, GSI SK: `email`) on UserProfile items

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

4. **Get all active users**
   Query `GSI: status-email-index` `PK: ACTIVE` → returns all active UserProfile items directly

5. **Lookup discordId by email (Google Chat identity resolution)**
   Query `GSI: status-email-index` `PK: ACTIVE` `SK: {email}` → returns matching UserProfile item

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

**GSI:** `status-email-index`
- GSI PK: `status` (ACTIVE | INACTIVE)
- GSI SK: `email`
- Enables: get all active users (Query GSI PK=ACTIVE) and lookup by email (Query GSI PK=ACTIVE SK=email)

**Schema Conventions:**
- `USER#` prefix identifies user partition
- Discord ID is the primary identifier
- Direct GetItem access by discordId; email lookup via `status-email-index` GSI

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
   Query `GSI: status-email-index` `PK: ACTIVE` → get all active user discordIds
   BatchGetItem `PK: USER#{discordId}` `SK: RECORD#{date}` for each active user

5. **Batch create meal records (nightly cron job)**
   Query `GSI: status-email-index` `PK: ACTIVE` → get all active user discordIds
   BatchWriteItem with multiple `PK: USER#{discordId}` `SK: RECORD#{YYYY-MM-DD}`

6. **Get team members' meal records for a specific date**
   GetItem `PK: TEAM` `SK: {teamId}` → get memberIds
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

### 3. Meal Schedule

#### Access Patterns

1. **Get schedule for a specific date**
   GetItem `PK: SCHEDULE` `SK: {YYYY-MM-DD}`

2. **Create schedule for a date**
   PutItem `PK: SCHEDULE` `SK: {YYYY-MM-DD}`

3. **Update schedule for a date**
   UpdateItem `PK: SCHEDULE` `SK: {YYYY-MM-DD}`

4. **Delete schedule for a date**
   DeleteItem `PK: SCHEDULE` `SK: {YYYY-MM-DD}`

5. **List all upcoming schedules**
   Query `PK: SCHEDULE` `SK >= today`

#### DB Schema

**PK:** `SCHEDULE`
**SK:** `{YYYY-MM-DD}`

**Attributes:**
- `date` (String) — YYYY-MM-DD
- `lunchEnabled` (Boolean) — Lunch available
- `snacksEnabled` (Boolean) — Snacks available
- `iftarEnabled` (Boolean) — Iftar available
- `eventDinnerEnabled` (Boolean) — Event dinner available
- `optionalDinnerEnabled` (Boolean) — Optional dinner available
- `occasionName` (String | null) — Optional occasion label
- `createdBy` (String) — discordId of admin who published the schedule
- `createdAt` (String) — ISO 8601 timestamp
- `updatedAt` (String) — ISO 8601 timestamp

**Schema Conventions:**
- Constant `SCHEDULE` PK groups all schedules in one partition — enables SK range query for listing
- Date as SK makes listing upcoming schedules a single `Query SK >= today` with no sentinel needed
- No weekends — schedules may only be created for Mon–Fri dates

---

---

### 5. Team

#### Access Patterns

1. **Get team details and member list**
   GetItem `PK: TEAM` `SK: {teamId}`

2. **Get all team member profiles**
   GetItem `PK: TEAM` `SK: {teamId}` → BatchGetItem `PK: USER#{discordId}` `SK: PROFILE` for each member

3. **Get all teams with details**
   Query `PK: TEAM` → returns all team items directly

4. **Get all users grouped by team**
   Query `GSI: status-email-index` `PK: ACTIVE` → returns all active UserProfile items → group by `teamId` in application

5. **Update team membership (add/remove members)**
   UpdateItem `PK: TEAM` `SK: {teamId}` ADD/DELETE `memberIds :discordId`

#### DB Schema

**PK:** `TEAM`
**SK:** `{teamId}`

**Attributes:**
- `teamId` (String) — Unique team identifier
- `name` (String) — Team name
- `leadId` (String) — Discord ID of team lead
- `memberIds` (StringSet) — Active member Discord IDs
- `createdAt` (String) — ISO 8601 timestamp
- `updatedAt` (String) — ISO 8601 timestamp

**Schema Conventions:**
- Constant `TEAM` PK groups all teams in one partition — enables `Query PK=TEAM` to list all teams without a sentinel
- `memberIds` StringSet — sustainable up to ~15,000 members per team before 400KB item limit
- Team lead's discordId used for authorization checks at command level

---


### 6. WFH Period

#### Access Patterns

1. **List all WFH periods sorted by start date**
   Query `PK: WFHPERIOD` — results naturally sorted by SK (`{dateFrom}#{uuid}`)

2. **Create WFH period**
   PutItem `PK: WFHPERIOD` `SK: {dateFrom}#{uuid}`

3. **Update WFH period**
   UpdateItem `PK: WFHPERIOD` `SK: {dateFrom}#{uuid}`

4. **Delete WFH period**
   DeleteItem `PK: WFHPERIOD` `SK: {dateFrom}#{uuid}`

5. **Check if a date falls within any WFH period**
   Query `PK: WFHPERIOD` → filter in application (`dateFrom <= date <= dateTo`)

#### DB Schema

**PK:** `WFHPERIOD`
**SK:** `{dateFrom}#{uuid}` — e.g. `2026-03-10#a1b2c3d4`

**Attributes:**
- `id` (String) — UUID portion of SK
- `dateFrom` (String) — YYYY-MM-DD start date
- `dateTo` (String) — YYYY-MM-DD end date
- `note` (String | null) — Optional description
- `createdAt` (String) — ISO 8601 timestamp
- `updatedAt` (String) — ISO 8601 timestamp

**Schema Conventions:**
- `WFHPERIOD` constant PK groups all periods under one partition
- `{dateFrom}#{uuid}` SK makes list results naturally date-sorted — no GSI needed
- UUID in SK suffix guarantees uniqueness for overlapping periods
- Client receives full SK when listing; uses it for update/delete operations

---

### 7. Audit Log

#### Access Patterns (write side — active now)

1. **Write audit entry on every mutation**
   PutItem `PK: AUDIT#{entityType}#{entityId}` `SK: {timestamp}#{uuid}`

2. **Get all changes made to a specific entity**
   Query `PK: AUDIT#{entityType}#{entityId}` (sorted chronologically by SK)


#### DB Schema

**PK:** `AUDIT#{entityType}#{entityId}`
**SK:** `{timestamp}#{uuid}`

**entityId format by entity type:**
- `USER` → `{discordId}`
- `MEAL_RECORD` → `{discordId}#{YYYY-MM-DD}` (e.g. `123456789012345678#2026-03-11`)
- `SCHEDULE` → `{YYYY-MM-DD}`
- `TEAM` → `{teamId}`
- `WFH_PERIOD` → `{uuid}`

**Attributes:**
- `id` (String) — UUID of this audit entry
- `timestamp` (String) — ISO 8601 timestamp
- `actorDiscordId` (String) — Who triggered the change
- `actorName` (String) — Denormalized name (historical snapshot)
- `action` (String) — CREATE | UPDATE | DELETE
- `entityType` (String) — USER | MEAL_RECORD | SCHEDULE | TEAM | WFH_PERIOD
- `entityId` (String) — Identifier of the changed entity (see format above)
- `targetDiscordId` (String | null) — For USER or MEAL_RECORD changes
- `changes` (Map) — `{ fieldName: { old: value, new: value } }`
- `metadata` (Map | null) — Optional context (command name, etc.)

**Schema Conventions:**
- `AUDIT#` prefix + entity type + entity ID groups all changes to one entity
- `{timestamp}#{uuid}` SK ensures chronological ordering and uniqueness
- Timestamp + UUID in SK: query descending for newest-first

---


## Key Design Principles

### GSI Design

One GSI is defined: `status-email-index` (GSI PK: `status`, GSI SK: `email`) on UserProfile items.
All other access patterns are served by primary key lookups and range queries — no additional GSIs needed.

| Pattern | Technique |
|---|---|
| Single entity lookup | GetItem by PK + SK |
| User's meal records (7 weekdays) | Query by PK, SK range |
| All active users (cron, headcount) | Query `status-email-index` PK=ACTIVE |
| Email → discordId lookup (Google Chat) | Query `status-email-index` PK=ACTIVE SK=email |
| List all teams | Query `PK=TEAM` |
| List upcoming schedules | Query `PK=SCHEDULE SK >= today` |
| WFH periods sorted by date | Query WFHPERIOD partition (dateFrom in SK) |
| Team members' records | TEAM item memberIds → BatchGetItem |

### Partition Key Conventions

| PK | Contents |
|---|---|
| `USER#{discordId}` | User profile + meal records for that user |
| `SCHEDULE` | All meal schedule items (SK = date) |
| `TEAM` | All team items (SK = teamId) |
| `WFHPERIOD` | All WFH period entries |
| `AUDIT#{entityType}#{entityId}` | Audit log entries for one entity |

### Sort Key Conventions

| SK pattern | Used by |
|---|---|
| `PROFILE` | User profile item |
| `RECORD#{date}` | Meal record — enables BETWEEN range query |
| `{YYYY-MM-DD}` | Meal schedule — enables `SK >= today` range query |
| `{teamId}` | Team item |
| `{dateFrom}#{uuid}` | WFH period — date-sorted, no GSI |
| `{timestamp}#{uuid}` | Audit log — chronological ordering |

### Denormalization Strategy

- `teamId` and `teamName` stored on UserProfile and MealRecord — avoids lookup on common queries
- Actor name stored on AuditLog entries — historical snapshot; doesn't change if user is renamed
- Full mutation history is in AuditLog — no `lastModifiedBy` shortcut needed on individual items


## Access Patterns Summary

### User Profile

| #   | Pattern                                    | Key Condition                                                                  |
| :-- | :----------------------------------------- | :----------------------------------------------------------------------------- |
| 1   | Get user profile by Discord ID             | `PK = USER#{discordId}` + `SK = PROFILE`                                       |
| 2   | Update user's WFH counter for the month    | UpdateItem `PK = USER#{discordId}` + `SK = PROFILE`                            |
| 3   | Batch get multiple user profiles           | BatchGetItem with multiple `PK = USER#{discordId}` + `SK = PROFILE`            |
| 4   | Get all active users                       | Query `GSI: status-email-index` + `GSI PK = ACTIVE`                            |
| 5   | Lookup discordId by email (Google Chat)         | Query `GSI: status-email-index` + `GSI PK = ACTIVE` + `GSI SK = {email}`      |

---

### Meal Record

| #   | Pattern                                                | Key Condition                                                                                                                    |
| :-- | :----------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| 4   | Get user's single meal record for a specific date      | `PK = USER#{discordId}` + `SK = RECORD#{YYYY-MM-DD}`                                                                             |
| 5   | Get user's next 7 weekday meal records                 | Query `PK = USER#{discordId}` + `SK BETWEEN RECORD#{startDate} AND RECORD#{endDate}`                                            |
| 6   | Create or update meal record for a user                | PutItem/UpdateItem `PK = USER#{discordId}` + `SK = RECORD#{YYYY-MM-DD}`                                                          |
| 7   | Get all meal records for a specific date (headcount)   | Query `GSI: status-email-index` `PK=ACTIVE` → BatchGetItem `PK = USER#{discordId}` + `SK = RECORD#{date}` for each            |
| 8   | Batch create meal records (nightly cron job)           | Query `GSI: status-email-index` `PK=ACTIVE` → BatchWriteItem `PK = USER#{discordId}` + `SK = RECORD#{YYYY-MM-DD}`             |
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

### Team

| #   | Pattern                              | Key Condition                                                                                                                                  |
| :-- | :----------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| 17  | Get team details and member list     | GetItem `PK = TEAM` + `SK = {teamId}`                                                                                                          |
| 18  | Get all team member profiles         | GetItem `PK = TEAM` + `SK = {teamId}` → BatchGetItem `PK = USER#{discordId}` + `SK = PROFILE` for each member                                 |
| 19  | Get all teams with details           | Query `PK = TEAM`                                                                                                                              |
| 20  | Get all users grouped by team        | Query `GSI: status-email-index` `PK=ACTIVE` → all active UserProfile items → group by teamId in app                                           |
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
