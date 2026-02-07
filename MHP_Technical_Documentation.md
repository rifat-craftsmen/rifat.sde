# Meal Headcount Planner (MHP) - Technical Documentation

## Executive Summary

The **Meal Headcount Planner (MHP)** is an internal web application designed to replace Excel-based meal tracking for 100+ employees. The system operates on a **"Default-Opt-In"** philosophy where all employees are assumed to be attending all scheduled meals unless they explicitly opt out.

**Core Principles:**
- **Default Opt-In**: All active employees are counted for available meals unless they opt out
- **7-Day Planning Window**: Users can add or modify meal participation for tomorrow through the next 6 days (not today)
- **Role-Based Hierarchy**: Admin > Team Lead > Employee | Logistics (view-only)
- **Eager Data Strategy**: Daily automated record creation at midnight for tomorrow only
- **User Preference Priority**: Manually created records are never overwritten by the automated system

---

## 1. System Architecture Overview

### 1.1 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React.js + Tailwind CSS | User interface and interactions |
| **Backend** | Node.js + Express | REST API server |
| **Database** | PostgreSQL | Persistent data storage |
| **ORM** | Prisma | Database schema management |
| **Authentication** | JWT (Cookie-based) | Secure session management |
| **Automation** | Node-cron | Daily record creation |

### 1.2 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  Employee Dashboard  │  Team Lead Dashboard  │  Admin Panel  │
│  Logistics Dashboard                                         │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    API LAYER (Express)                       │
├─────────────────────────────────────────────────────────────┤
│  Authentication  │  Meal Management  │  Schedule  │  Reports │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE (PostgreSQL)                      │
├─────────────────────────────────────────────────────────────┤
│   Users   │   Teams   │   MealSchedule   │   MealRecords    │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    AUTOMATION (Cron)                         │
├─────────────────────────────────────────────────────────────┤
│  Daily Record Creation (Respects Existing Records)          │
└─────────────────────────────────────────────────────────────┘
```

---
## 2. Database Schema

### 2.1 Complete Prisma Schema

```prisma
// ============================================================
// USER MANAGEMENT
// ============================================================

model User {
  id        Int          @id @default(autoincrement())
  name      String
  email     String       @unique
  password  String       // Hashed password
  role      Role         @default(EMPLOYEE)
  status    UserStatus   @default(ACTIVE)
  teamId    Int?
  
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
  
  // Relations
  team      Team?        @relation(fields: [teamId], references: [id])
  records   MealRecord[]
  
  @@index([email])
  @@index([teamId])
  @@index([status])
}

enum Role {
  EMPLOYEE
  LEAD
  ADMIN
  LOGISTICS
}

enum UserStatus {
  ACTIVE
  INACTIVE
}

model Team {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  leadId    Int      @unique
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  members   User[]
  lead      User     @relation("TeamLead", fields: [leadId], references: [id])
  
  @@index([leadId])
}

// ============================================================
// MEAL SCHEDULING
// ============================================================

model MealSchedule {
  id        Int      @id @default(autoincrement())
  date      DateTime @unique @db.Date
  
  // Meal availability flags (true = available, false = disabled)
  lunchEnabled          Boolean @default(true)
  snacksEnabled         Boolean @default(true)
  iftarEnabled          Boolean @default(false)
  eventDinnerEnabled    Boolean @default(false)
  optionalDinnerEnabled Boolean @default(false)
  
  // Context information
  occasionName String?  // e.g., "Company Annual Celebration", "Ramadan"
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy Int      // User ID who created this schedule entry
  
  @@index([date])
}

// ============================================================
// MEAL PARTICIPATION RECORDS
// ============================================================

model MealRecord {
  id        Int      @id @default(autoincrement())
  userId    Int
  date      DateTime @db.Date
  
  // Participation flags (true = attending, false = opted out)
  lunch          Boolean @default(false)
  snacks         Boolean @default(false)
  iftar          Boolean @default(false)
  eventDinner    Boolean @default(false)
  optionalDinner Boolean @default(false)
  
  // Metadata
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  lastModifiedBy Int?      // User ID who last modified (for proxy edits)
  notificationSent Boolean @default(false) // For future notification feature
  
  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, date])
  @@index([date])
  @@index([userId])
}
```

### 2.2 Schema Design Rationale

**User Table:**
- Single `role` field per requirement (no combined roles)
- `teamId` links employees to their team for Team Lead access control

**Team Table:**
- `leadId` is unique to ensure one Lead per team
- Self-referential relationship: Team Lead is also a User with role=LEAD

**MealSchedule Table:**
- Created **only for exception days** (holidays, special events)
- If no record exists for a date, defaults apply: Lunch=true, Snacks=true, others=false
- `occasionName` provides context to employees ("Why is Event Dinner available today?")

**MealRecord Table:**
- `@@unique([userId, date])` prevents duplicate records
- All meal booleans default to `false` in schema; actual defaults come from cron job logic
- `lastModifiedBy` tracks proxy edits (NULL = self-edit, otherwise Team Lead/Admin ID)
- `notificationSent` prepared for future iteration (notification when Lead/Admin edits)

---
---

## 3. User Roles & Permissions

### 3.1 Role Hierarchy

```
        ADMIN (Full System Control)
           ↓
     TEAM LEAD (Team Scope Only)
           ↓
      EMPLOYEE (Self Only)
      
      LOGISTICS (Read-Only Reports)
```

### 3.2 Permission Matrix

| Action | Employee | Team Lead | Admin | Logistics |
|--------|----------|-----------|-------|-----------|
| View own 7-day schedule | ✅ | ✅ | ✅ | ❌ |
| Add/edit own meals (tomorrow+6) | ✅ | ✅ | ✅ | ❌ |
| View own monthly stats | ✅ | ✅ | ✅ | ❌ |
| View team members | ❌ | ✅ (own team) | ✅ (all) | ❌ |
| Add/edit team members' meals | ❌ | ✅ (own team) | ✅ (all) | ❌ |
| Create special meal schedules | ❌ | ❌ | ✅ | ❌ |
| View daily headcount | ❌ | ❌ | ✅ | ✅ |

### 3.3 Access Control Logic

**Team Lead Restrictions:**
- Can only search and view employees within their assigned team
- Team assignment determined by the teamId field in User table
- Backend validates team membership before allowing any proxy operations

**Admin Privileges:**
- Can search and manage all employees across all teams
- Can create global meal schedule exceptions
- Can view all reports and analytics

**Logistics Role:**
- Read-only access to headcount reports
- Cannot modify any meal records or schedules
- Primary purpose: View daily totals for catering vendor coordination

---

## 4. Core Business Logic

### 4.1 Daily Cron Job (Midnight Automation)

**Purpose:** Automatically create meal records for tomorrow for all active employees

**Process:**
1. Runs every day at 12:00 AM server time
2. Identifies tomorrow's date
3. Fetches all users with status = ACTIVE
4. Checks if MealSchedule exists for tomorrow
5. Determines meal availability (uses schedule if exists, otherwise defaults: Lunch=true, Snacks=true, others=false)
6. **CRITICAL CHECK**: For each user, verifies if a MealRecord already exists for tomorrow
7. **If record exists**: Skip that user (preserves user's manual preferences)
8. **If record does NOT exist**: Create new record with determined meal defaults
9. Sets lastModifiedBy = null (system-generated, not user-modified)
10. Sets notificationSent = false

**Key Behavior:**
- Only creates records for users who haven't manually added their own
- Never overwrites existing records
- Respects user preferences even if they were set weeks in advance

---

### 4.2 Add Meal Record (Manual Creation)

**Purpose:** Allow users to create meal records in advance for future dates within the valid window

**Use Cases:**
- Employee knows they'll be absent next week and wants to opt out in advance
- Team Lead planning team lunch for Friday and wants to ensure everyone is counted
- Admin preparing for a special event and pre-setting attendance

**Process:**
1. User selects a date within the valid window (tomorrow through next 6 days)
2. User specifies which meals they want to attend
3. System validates the date is within the allowed range
4. System checks if a record already exists for that user and date
5. **If record exists**: Update the existing record
6. **If record does NOT exist**: Create a new record with user's selections
7. Set lastModifiedBy appropriately (null for self, user ID for proxy)
8. Set notificationSent = false if it's a proxy edit

**Important Notes:**
- When cron job runs, it will skip this user for this date because a record already exists
- User's manual preferences are preserved regardless of when they were created
- This allows proactive planning beyond just opting out of today's defaults

---

### 4.3 Update Meal Record (Modification)

**Purpose:** Allow users to modify existing meal participation

**Business Rules:**
- Can only modify meals for tomorrow through next 6 days (cannot edit today)
- Employees can only modify their own records
- Team Leads can modify records for their team members only
- Admins can modify records for any employee

**Process:**
1. User changes meal selections (checking or unchecking meal types)
2. System validates the date is within the valid window
3. System validates user has permission to modify the target user's record
4. System updates the existing MealRecord
5. Sets lastModifiedBy field (null for self-edit, modifier's user ID for proxy edit)
6. Sets notificationSent = false if modified by someone other than the record owner

---

### 4.4 Headcount Calculation

**Purpose:** Provide logistics team with accurate meal counts for catering vendor

**Process:**
1. Select target date (typically "today" for same-day counts)
2. Fetch all MealRecords for that date
3. Count records where each meal boolean = true
4. Return totals for each meal type: Lunch, Snacks, Iftar, Event Dinner, Optional Dinner
5. Also return total number of employees with records for context

**Output Format:**
- Lunch: 95 people
- Snacks: 87 people
- Iftar: 0 people
- Event Dinner: 102 people
- Optional Dinner: 12 people
- Total Employees: 105 people

---

### 4.5 Monthly Analytics

**Purpose:** Show employees their meal consumption patterns

**Calculation:**
1. Identify current calendar month boundaries
2. Fetch all MealRecords for the user within that month
3. Count total meals consumed (each meal type counts as 1 meal)
4. Example: If user attended Lunch + Snacks on 10 days = 20 total meals
5. Optionally provide breakdown by meal type

**Display:**
- Simple card showing "18 Meals Taken This Month"
- Optional detailed breakdown showing individual meal type counts

---

## 5. API Endpoints Overview

### 5.1 Authentication
- **Login**: Accepts email/password, returns JWT in secure cookie
- **Logout**: Clears authentication cookie
- **Get Current User**: Returns logged-in user's profile and role

### 5.2 Employee Operations
- **Get My Schedule**: Returns 7-day meal grid (tomorrow through next 6 days)
- **Add Meal Record**: Creates a new meal record for a future date within valid window
- **Update My Meals**: Modifies existing meal record for future dates
- **Get My Stats**: Returns monthly meal consumption totals

### 5.3 Team Lead Operations
- **Get Team Members**: Lists all employees in the Team Lead's team
- **Get Employee Schedule**: Views a team member's 7-day meal grid
- **Add/Update Employee Meals**: Creates or modifies team member's meal record (proxy operation)

### 5.4 Admin Operations
- **Search All Employees**: Searches across entire organization
- **Get Any Employee Schedule**: Views any employee's meal grid
- **Add/Update Any Employee Meals**: Creates or modifies any employee's meal record
- **Create Meal Schedule**: Defines special occasion or exception for a specific date
- **Delete Meal Schedule**: Removes exception (reverts to defaults)

### 5.5 Logistics Operations
- **Get Daily Headcount**: Returns meal totals for a specific date
- **Get Monthly Report**: Returns aggregated headcount data for a date range

---

## 6. Frontend User Interfaces

### 6.1 Employee Dashboard

**Components:**
- **Monthly Stats Card**: Displays total meals consumed this month
- **7-Day Meal Grid**: Shows tomorrow through next 6 days with checkboxes for each available meal type
- **Action Buttons**: "Add Future Meal" button to create records for dates not yet generated by cron

**Interaction Flow:**
1. Employee logs in and sees their dashboard
2. Views their upcoming 7 days with current meal selections
3. Can check/uncheck any meal for any day in the valid window
4. Changes save immediately with optimistic UI updates
5. If meal is edited by Team Lead/Admin, visual indicator shows "Modified by [Name]"

**Visual Feedback:**
- Green checkmarks for attending meals
- Gray checkboxes for opted-out meals
- Special badge if meal is part of an occasion (e.g., "Company Celebration")

---

### 6.2 Team Lead Dashboard

**Components:**
- **Team Member Search Bar**: Search by name or email within team
- **Team Member List**: Shows all team members with quick access to their schedules
- **Employee Edit Modal**: Opens when clicking a team member, shows their 7-day grid for proxy editing

**Interaction Flow:**
1. Team Lead searches for employee
2. Clicks on employee name
3. Modal opens showing employee's full 7-day meal grid
4. Team Lead can add/modify meals on employee's behalf
5. System records the Team Lead's user ID as lastModifiedBy
6. Employee will be notified in future iteration

**Use Cases:**
- Employee forgot to opt out and asked Team Lead to do it for them
- Team Lead knows employee is on vacation and opts them out proactively
- Emergency last-minute changes before meal cutoff

---

### 6.3 Admin Dashboard

**Components:**
- **Global Employee Search**: Search across all teams and employees
- **Schedule Management Panel**: Create/edit special occasions and meal availability rules
- **System Statistics**: Overview of active employees, upcoming events, etc.
- **Headcount View**: Same as Logistics dashboard

**Admin-Specific Features:**
- Create special occasions (e.g., "Ramadan 2025" with Iftar enabled for date range)
- Mark office closure dates (disables all meals)
- View audit information (who modified what)

---

### 6.4 Logistics Dashboard

**Components:**
- **Date Selector**: Calendar picker to view any date's headcount
- **Headcount Cards**: Large, clear display of totals for each meal type
- **Export Button**: Download report as CSV/PDF for catering vendor

**Primary Use Case:**
- Logistics team checks headcount at 9 AM each day
- Sends totals to catering vendor for same-day meal preparation
- Monitors trends to optimize food ordering

---

## 7. Data Flow Examples

### 7.1 Cron Job Respecting User Preferences

**Scenario:** Employee creates a future meal record manually, then cron job runs

**Timeline:**
- **Monday 2 PM**: Employee manually creates record for Wednesday, opts out of Lunch
- **Tuesday 12 AM**: Cron job runs to create records for Wednesday
- **Cron Logic**: Checks if record exists for this employee for Wednesday → Found! → Skip this employee
- **Result**: Employee's Monday preference (no Lunch) is preserved

---

### 7.2 Employee Adding Future Meals

**Scenario:** Employee wants to opt out of meals for next week

**Flow:**
1. Employee clicks "Add Future Meal" button
2. Selects date: Monday next week (5 days from now)
3. Unchecks Lunch and Snacks
4. Clicks "Save"
5. System creates new MealRecord with lunch=false, snacks=false
6. Record appears in employee's 7-day grid
7. When cron runs over the weekend, it skips this employee for Monday (record already exists)

---

### 7.3 Team Lead Proxy Edit with Notification Hook

**Scenario:** Employee forgets to opt out, Team Lead helps

**Flow:**
1. Employee messages Team Lead: "I'm sick tomorrow, can you opt me out?"
2. Team Lead searches for employee in their dashboard
3. Opens employee's schedule modal
4. Unchecks all meals for tomorrow
5. Clicks "Save"
6. System updates record, sets lastModifiedBy = Team Lead's user ID
7. System sets notificationSent = false
8. **(Future iteration)** Background job detects notificationSent = false, sends email to employee: "Your meals for tomorrow were updated by [Team Lead Name]"

---

### 7.4 Admin Creating Special Occasion

**Scenario:** Company annual party with Event Dinner

**Flow:**
1. Admin navigates to Schedule Management
2. Clicks "Create Special Occasion"
3. Fills form:
   - Date: March 15, 2025
   - Event Dinner: Enabled
   - Occasion Name: "Company Annual Celebration"
   - Other meals: Keep defaults
4. Clicks "Save"
5. System creates MealSchedule record for March 15
6. When cron runs on March 14 at midnight:
   - Fetches MealSchedule for March 15
   - Creates records with eventDinner = true for all active employees
7. All employees see "Event Dinner" checkbox on their March 15 row with "Company Annual Celebration" badge

---

## 8. Security & Data Protection

### 8.1 Authentication
- JWT tokens stored in HTTP-only cookies (prevents XSS attacks)
- Secure flag enabled in production (HTTPS only)
- SameSite=Strict for CSRF protection
- Tokens expire after 7 days

### 8.2 Password Security
- All passwords hashed using bcrypt with salt rounds = 10
- Plain text passwords never stored in database
- Password validation on login compares hash

### 8.3 Authorization
- Every API endpoint validates user role before processing
- Team Lead operations verify team membership
- Admin operations check for ADMIN role
- Middleware rejects unauthorized requests with 403 Forbidden

### 8.4 Input Validation
- All date inputs validated to be within allowed range
- Boolean fields validated to be true/false only
- SQL injection prevented by Prisma's parameterized queries
- Cross-site scripting prevented by React's automatic escaping

---

## Conclusion

The Meal Headcount Planner (MHP) replaces manual Excel tracking with an automated, user-friendly system that:

1. **Minimizes Data Entry**: Default opt-in and automated record creation reduce manual work
2. **Respects User Intent**: User-created records are never overwritten by automation
3. **Supports Flexibility**: Users can plan meals up to 7 days in advance
4. **Enables Delegation**: Team Leads can manage their team efficiently
5. **Provides Visibility**: Logistics team gets real-time accurate headcounts
6. **Scales Easily**: PostgreSQL and React can handle growth beyond 100 employees
7. **Future-Ready**: Notification hooks and extensible schema support upcoming features.

---