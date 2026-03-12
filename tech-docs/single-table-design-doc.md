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

### 3. Meal Schedule

#### Access Patterns

1. **Get schedule for a specific date**
   GetItem `PK: SCHEDULE#{YYYY-MM-DD}` `SK: METADATA`

2. **Create schedule for a date**
   PutItem `PK: SCHEDULE#{YYYY-MM-DD}` `SK: METADATA`
   Then UpdateItem `PK: SYSTEM` `SK: UPCOMING_SCHEDULES` ADD `scheduleDates :date`

3. **Update schedule for a date**
   UpdateItem `PK: SCHEDULE#{YYYY-MM-DD}` `SK: METADATA`

4. **Delete schedule for a date**
   DeleteItem `PK: SCHEDULE#{YYYY-MM-DD}` `SK: METADATA`
   Then UpdateItem `PK: SYSTEM` `SK: UPCOMING_SCHEDULES` DELETE `scheduleDates :date`

5. **List all upcoming schedules**
   GetItem `PK: SYSTEM` `SK: UPCOMING_SCHEDULES` → get `scheduleDates` StringSet
   BatchGetItem `PK: SCHEDULE#{date}` `SK: METADATA` for each date in set
   Filter in application: `date >= today`

#### DB Schema

**PK:** `SCHEDULE#{YYYY-MM-DD}`
**SK:** `METADATA`

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
- `SCHEDULE#` prefix + date as PK enables direct GetItem by date
- `METADATA` is a constant SK for schedule configuration
- No weekends — schedules may only be created for Mon–Fri dates

---

### 4. System Sentinels

All sentinels live under `PK: SYSTEM`. They act as pre-built indexes to avoid full table scans.

#### 4a. Active Users

**Access Patterns:**

1. **Get all active Discord IDs (cron, headcount)**
   GetItem `PK: SYSTEM` `SK: ACTIVE_USERS`

2. **Add/remove user from active list**
   UpdateItem `PK: SYSTEM` `SK: ACTIVE_USERS` ADD/DELETE `memberIds :discordId`

**PK:** `SYSTEM`
**SK:** `ACTIVE_USERS`

**Attributes:**
- `memberIds` (StringSet) — Set of active user Discord IDs
- `updatedAt` (String) — ISO 8601 timestamp

---

#### 4b. All Teams

**Access Patterns:**

1. **Get all team IDs**
   GetItem `PK: SYSTEM` `SK: ALL_TEAMS`
   Then BatchGetItem `PK: TEAM#{teamId}` `SK: METADATA` for each

2. **Add/remove team from list**
   UpdateItem `PK: SYSTEM` `SK: ALL_TEAMS` ADD/DELETE `teamIds :teamId`

**PK:** `SYSTEM`
**SK:** `ALL_TEAMS`

**Attributes:**
- `teamIds` (StringSet) — Set of all team identifiers
- `updatedAt` (String) — ISO 8601 timestamp

---

#### 4c. Upcoming Schedules

**Access Patterns:**

1. **Get all published schedule dates**
   GetItem `PK: SYSTEM` `SK: UPCOMING_SCHEDULES`
   Then BatchGetItem `PK: SCHEDULE#{date}` `SK: METADATA` for each date
   Filter: `date >= today`

2. **Add/remove date from list (on schedule create/delete)**
   UpdateItem `PK: SYSTEM` `SK: UPCOMING_SCHEDULES` ADD/DELETE `scheduleDates :date`

**PK:** `SYSTEM`
**SK:** `UPCOMING_SCHEDULES`

**Attributes:**
- `scheduleDates` (StringSet) — Set of dates (YYYY-MM-DD) with a published schedule
- `updatedAt` (String) — ISO 8601 timestamp

---

### 5. Team

#### Access Patterns

1. **Get team details and member list**
   GetItem `PK: TEAM#{teamId}` `SK: METADATA`

2. **Get all team member profiles**
   GetItem `PK: TEAM#{teamId}` `SK: METADATA` → BatchGetItem `USER#{discordId}/PROFILE` for each member

3. **Get all teams with details**
   GetItem `PK: SYSTEM` `SK: ALL_TEAMS` → BatchGetItem `TEAM#{teamId}/METADATA` for each

4. **Get all users grouped by team**
   GetItem `PK: SYSTEM` `SK: ACTIVE_USERS` → BatchGetItem all `USER#{discordId}/PROFILE` → group by `teamId` in application

5. **Update team membership (add/remove members)**
   UpdateItem `PK: TEAM#{teamId}` `SK: METADATA` ADD/DELETE `memberIds :discordId`

#### DB Schema

**PK:** `TEAM#{teamId}`
**SK:** `METADATA`

**Attributes:**
- `teamId` (String) — Unique team identifier
- `name` (String) — Team name
- `leadId` (String) — Discord ID of team lead
- `memberIds` (StringSet) — Active member Discord IDs
- `createdAt` (String) — ISO 8601 timestamp
- `updatedAt` (String) — ISO 8601 timestamp

**Schema Conventions:**
- `TEAM#` prefix identifies team partition
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
- GSI fields (`gsi1pk`, `gsi2pk`) are intentionally omitted — add when audit viewer command is built

---


## Key Design Principles

### Zero GSI Design

All access patterns are served by primary key lookups, range queries, and the sentinel pattern.
No GSIs are defined on this table.

| Pattern | Technique |
|---|---|
| Single entity lookup | GetItem by PK + SK |
| User's meal records (7 weekdays) | Query by PK, SK range |
| Headcount for a date | ACTIVE_USERS sentinel → BatchGetItem |
| List all teams | ALL_TEAMS sentinel → BatchGetItem |
| List upcoming schedules | UPCOMING_SCHEDULES sentinel → BatchGetItem |
| WFH periods sorted by date | Query WFHPERIOD partition (dateFrom in SK) |
| Team members' records | TEAM item memberIds → BatchGetItem |

### Sentinel Pattern

Sentinel items in the `SYSTEM` partition act as pre-built indexes for collections that would otherwise require a full table scan or GSI.

| SK | Purpose |
|---|---|
| `ACTIVE_USERS` | All active user Discord IDs → used by cron and headcount |
| `ALL_TEAMS` | All team IDs → used for listing teams |
| `UPCOMING_SCHEDULES` | All published schedule dates → used for schedule listing |

**Rule:** Every write that affects a sentinel (user activated, team created, schedule published) must also atomically update the relevant sentinel item.

### Prefix Conventions

| Prefix | Partition |
|---|---|
| `USER#` | User profiles and meal records |
| `RECORD#` | Meal record sort key |
| `SCHEDULE#` | Meal schedule configuration |
| `TEAM#` | Team configuration |
| `WFHPERIOD` | Global WFH period entries |
| `AUDIT#` | Audit log entries |
| `SYSTEM` | System-wide sentinels and metadata |

### Denormalization Strategy

- `teamId` and `teamName` stored on UserProfile and MealRecord — avoids lookup on common queries
- Actor name stored on AuditLog entries — historical snapshot; doesn't change if user is renamed
- Full mutation history is in AuditLog — no `lastModifiedBy` shortcut needed on individual items

### Sort Key Design

- `RECORD#{date}` on SK enables BETWEEN range queries for weekday windows
- `{dateFrom}#{uuid}` on WFH Period SK enables date-sorted query with no GSI
- `{timestamp}#{uuid}` on AuditLog SK enables chronological ordering and uniqueness


## Access Patterns Summary

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
| 9   | Get team members' meal records for a specific date     | GetItem `PK = TEAM#{teamId}` + `SK = METADATA` → BatchGetItem `PK = USER#{discordId}` + `SK = RECORD#{date}` for each member   |

---

### Meal Schedule

| #   | Pattern                        | Key Condition                                                                                                                                                                                |
| :-- | :----------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10  | Get schedule for a specific date | `PK = SCHEDULE#{YYYY-MM-DD}` + `SK = METADATA`                                                                                                                                               |
| 11  | Create schedule for a date       | PutItem `PK = SCHEDULE#{YYYY-MM-DD}` + `SK = METADATA` → UpdateItem `PK = SYSTEM` + `SK = UPCOMING_SCHEDULES` ADD scheduleDates                                                             |
| 12  | Update schedule for a date       | UpdateItem `PK = SCHEDULE#{YYYY-MM-DD}` + `SK = METADATA`                                                                                                                                    |
| 13  | Delete schedule for a date       | DeleteItem `PK = SCHEDULE#{YYYY-MM-DD}` + `SK = METADATA` → UpdateItem `PK = SYSTEM` + `SK = UPCOMING_SCHEDULES` DELETE scheduleDates                                                       |
| 14  | List all upcoming schedules      | GetItem `PK = SYSTEM` + `SK = UPCOMING_SCHEDULES` → BatchGetItem `PK = SCHEDULE#{date}` + `SK = METADATA` for each date → filter `date >= today` in app                                     |

---

### System Sentinels

| #   | Pattern                                      | Key Condition                                                                                                |
| :-- | :------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| 15  | Get all active Discord IDs (cron, headcount) | `PK = SYSTEM` + `SK = ACTIVE_USERS`                                                                          |
| 16  | Add/remove user from active list             | UpdateItem `PK = SYSTEM` + `SK = ACTIVE_USERS` ADD/DELETE memberIds                                          |
| 17  | Get all team IDs                             | `PK = SYSTEM` + `SK = ALL_TEAMS` → BatchGetItem `PK = TEAM#{teamId}` + `SK = METADATA` for each             |
| 18  | Add/remove team from list                    | UpdateItem `PK = SYSTEM` + `SK = ALL_TEAMS` ADD/DELETE teamIds                                               |
| 19  | Get all published schedule dates             | `PK = SYSTEM` + `SK = UPCOMING_SCHEDULES` → BatchGetItem `PK = SCHEDULE#{date}` + `SK = METADATA` for each  |
| 20  | Add/remove date from schedule list           | UpdateItem `PK = SYSTEM` + `SK = UPCOMING_SCHEDULES` ADD/DELETE scheduleDates                                |

---

### Team

| #   | Pattern                              | Key Condition                                                                                                                                                |
| :-- | :----------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 21  | Get team details and member list     | `PK = TEAM#{teamId}` + `SK = METADATA`                                                                                                                       |
| 22  | Get all team member profiles         | GetItem `PK = TEAM#{teamId}` + `SK = METADATA` → BatchGetItem `PK = USER#{discordId}` + `SK = PROFILE` for each member                                      |
| 23  | Get all teams with details           | GetItem `PK = SYSTEM` + `SK = ALL_TEAMS` → BatchGetItem `PK = TEAM#{teamId}` + `SK = METADATA` for each                                                     |
| 24  | Get all users grouped by team        | GetItem `PK = SYSTEM` + `SK = ACTIVE_USERS` → BatchGetItem `PK = USER#{discordId}` + `SK = PROFILE` for all → group by teamId in app                        |
| 25  | Update team membership               | UpdateItem `PK = TEAM#{teamId}` + `SK = METADATA` ADD/DELETE memberIds                                                                                       |

---

### WFH Period

| #   | Pattern                                      | Key Condition                                                                                    |
| :-- | :------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| 26  | List all WFH periods sorted by start date    | Query `PK = WFHPERIOD` (sorted by SK: `{dateFrom}#{uuid}`)                                       |
| 27  | Create WFH period                            | PutItem `PK = WFHPERIOD` + `SK = {dateFrom}#{uuid}`                                              |
| 28  | Update WFH period                            | UpdateItem `PK = WFHPERIOD` + `SK = {dateFrom}#{uuid}`                                           |
| 29  | Delete WFH period                            | DeleteItem `PK = WFHPERIOD` + `SK = {dateFrom}#{uuid}`                                           |
| 30  | Check if a date falls within any WFH period  | Query `PK = WFHPERIOD` → filter in app (dateFrom <= date <= dateTo)                             |

---

### Audit Log

| #   | Pattern                                      | Key Condition                                                                                    |
| :-- | :------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| 31  | Write audit entry on every mutation          | PutItem `PK = AUDIT#{entityType}#{entityId}` + `SK = {timestamp}#{uuid}`                         |
| 32  | Get all changes made to a specific entity    | Query `PK = AUDIT#{entityType}#{entityId}` (sorted chronologically by SK)                        |

---

