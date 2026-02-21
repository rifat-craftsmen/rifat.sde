## Meal Headcount Planner Technical Design Document
- Author: Rifat Ahmed
- Iteration: 3
- Version: v1
- Status: In Review

---

## 1. Summary

The **Meal Headcount Planner (MHP)** is an internal web application designed to replace the current Excel-based meal tracking system for 100+ employees. The system automates daily headcount collection for multiple meal types (Lunch, Snacks, Iftar, Event Dinner, Optional Dinner) while minimizing manual data entry through a **"Default-Opt-In"** approach where all active employees are assumed to be attending meals unless they explicitly opt out.

**Key Capabilities:**
- Automated daily meal record creation for all active employees
- 7-day advance planning window for employees to manage meal participation
- Role-based access control (Admin, Team Lead, Employee, Logistics)
- Real-time headcount reporting for logistics team
- Special occasion scheduling for events and holidays
- Proxy meal management by Team Leads and Admins


**Expected Outcomes:**
- Reduce logistics team workload through automation
- Provide accurate daily headcount within seconds
- Enable employees to plan meals up to 7 days in advance
- Maintain complete audit trail of meal participation changes
- Eliminate manual Excel file sharing and consolidation


**Key New Features added at Iteration 2:**
1. Team-based visibility and participation tracking
2. Bulk meal update operations for Team Leads and Admins
3. Work location (Office/WFH) tracking per employee per date
4. Company-wide WFH period management
5. Enhanced headcount reporting with team breakdown and office/WFH split
6. Daily announcement message generation
7. Special day type presets (Office Closed, Government Holiday, etc.)
8. Live HeadCount dashboard updates


**Key New Features added at Iteration 3:**
1. Auditability columns in Daily Participation view (last modified by, modified at)
2. Special occasion badge on Headcount tab when a schedule occasion exists for selected date
3. WFH over-limit indicators in Daily Participation view (per-employee WFH count column, red highlight if > 5, summary cards)
4. WFH over-limit filter in Daily Participation view


---

## 2. Problem Statement

### 2.1 Current State

The organization currently uses an Excel-based system to track daily meal headcount for 100+ employees across multiple meal types. This process involves:

1. A Google Sheet is shared with all employees
2. Employees manually update their meal participation row-by-row
3. Team Leads chase down non-responsive team members
4. Logistics team manually consolidates responses
5. Headcount is calculated using Excel formulas across multiple sheets
6. Then results are notified to chef.

### 2.2 Pain Points
- **Time-Consuming**: Logistics team spends a good amount of time daily consolidating data
- **Error-Prone**: Manual data entry may lead to incorrect headcounts
- **Employee Satisfaction**: Manual process frustrates both employees and logistics team
- **Late Responses**: Employees may forget to update their status
- **Catering**: Late headcount submissions strain catering process
- **No Historical Data**: No easy way to track meal consumption trends
- **Version Control**: Multiple people editing the same sheet causes conflicts
- **Access Issues**: Google Sheets authentication problems for some employees
- **Scalability**: Process will be very hard to maintain as employee count grows beyond hundred.

---

## 3. Goals and Non-Goals

### 3.1 Goals

**Primary Goals:**
1. **Automation**: Eliminate 80% of manual data entry through automated record creation
2. **Accuracy**: Reduce headcount variance
3. **Speed**: Provide real-time headcount instead of hours manual consolidation
4. **User Experience**: Enable employees to manage meals in <30 seconds per day
5. **Flexibility**: Allow advance planning up to 7 days ahead
6. **Audit Trail**: Track all meal participation changes with user attribution

**Secondary Goals:**
1. Enable Team Leads to manage their team's meal participation (proxy management)
2. Support special occasions (company events, Ramadan, holidays)
3. Provide monthly analytics to employees (meal consumption history)
4. Create foundation for future notification system

### 3.2 Non-Goals

**Out of Scope for Current Implementation:**
1. **Email/SMS Notifications**: Notification infrastructure deferred to Iteration 2
3. **Integration with HR Systems**: Manual user management acceptable for now
4. **Advanced Reporting**: Complex analytics and trend analysis deferred
5. **Multi-Location Support**: Single office location only
6. **Meal Preference Tracking**: No dietary restrictions or meal customization
7. **Budget Tracking**: Cost calculation and budget management not included
8. **Vendor Integration**: No direct API integration with catering vendor
9. **Attendance Verification**: No QR code check-in or attendance validation
10. **Historical Data Migration**: No import of Excel historical data

---

## 4. Requirements

### 4.1 Functional Requirements

**FR1: User Authentication & Authorization**
- FR1.1: System must support secure login with email/password
- FR1.2: System must implement four distinct roles: Admin, Team Lead, Employee, Logistics
- FR1.3: System must enforce role-based permissions for all operations
- FR1.4: Sessions must remain active for 7 days with secure cookie storage

**FR2: Meal Participation Management**
- FR2.1: Employees must be able to view their meal schedule for the next 7 days
- FR2.2: Employees must be able to opt out of any meal within the valid window (tomorrow through next 6 days)
- FR2.3: Employees must be able to proactively add meal records for future dates
- FR2.4: System must prevent editing of today's meals (cutoff has passed)
- FR2.5: System must display monthly meal consumption statistics per employee

**FR3: Team Lead Capabilities**
- FR3.1: Team Leads must be able to view all members of their assigned team
- FR3.2: Team Leads must be able to modify team members' meal participation (proxy edit)
- FR3.3: Team Leads must NOT be able to access other teams' data
- FR3.4: System must record proxy edits with Team Lead's user ID for audit purposes

**FR4: Admin Capabilities**
- FR4.1: Admins must be able to search and manage all employees across all teams
- FR4.2: Admins must be able to create special meal schedules (occasions, holidays)
- FR4.3: Admins must be able to enable/disable specific meal types for specific dates
- FR4.4: Admins must be able to set occasion names (e.g., "Company Annual Celebration")
- FR4.5: Admins must have full system access without team restrictions



**FR5: Logistics Reporting**
- FR5.1: Logistics team must be able to view daily headcount for all meal types
- FR5.2: Logistics team must be able to select any date for historical reporting
- FR5.3: System must display headcount as simple totals per meal type
- FR5.4: Logistics role must be read-only (no meal editing permissions)

**FR6: Automated Record Creation**
- FR6.1: System must automatically create meal records for tomorrow at 9PM daily
- FR6.2: System must apply meal schedule rules when creating records
- FR6.3: System must NOT overwrite manually created records
- FR6.4: System must use default meal availability (Lunch=true, Snacks=true, others=false) if no schedule exists

**FR7: Data Integrity**
- FR7.1: System must prevent duplicate meal records per user per date
- FR7.2: System must maintain audit metadata (lastModifiedBy, timestamps)
- FR7.3: System must preserve user preferences even when created days in advance


**FR8: User Management (Admin)**
- FR8.1: Admins must be able to create new user accounts
- FR8.2: User creation form must include:
  - Name (required)
  - Email (required, unique)
  - Role (required, dropdown: EMPLOYEE, LEAD, ADMIN, LOGISTICS)
  - Team (optional)
  - Initial password (auto-generated or admin-provided)

- FR8.3: System must hash passwords before storing in database
- FR8.4: System must display generated password and admin will share it with new user
- FR8.5: [Future Enhancement] System should send welcome email with password reset link to new users mail where he can set new - password
- FR8.6: Admins must be able to deactivate and delete users
- FR8.7: Inactive users must not appear in meal planning.



**FR9: Team-Based Visibility**
- FR9.1: Employees must see their team name displayed on dashboard
- FR9.2: Team Leads must view daily participation of their team members with date selection
- FR9.3: Admin must view daily participation across all teams
- FR9.4: Daily participation view must show employee names, teams, work location, and meal selections

**FR10: Bulk Operations**
- FR10.1: Team Leads must apply bulk actions to their team members within valid date window
- FR10.2: Admins must apply bulk actions to any employees within valid date window
- FR10.3: Bulk actions supported: WFH for All, All Off, Set All Meals, Unset All Meals
- FR10.4: Bulk operations should use database transactions for atomicity
- FR10.5: Bulk operations must record admin/lead user ID in `lastModifiedBy` field

**FR11: Work Location Tracking**
- FR11.1: Employees must chose `WFH` if want to work from home for any date in valid window (office is default)
- FR11.2: WFH selection must automatically set all meals to false and WFH=true
- FR11.3: Work location is default to Office (WFH=false)
- FR11.4: Team Leads/Admins must correct work location via daily participation tab or bulk actions

**FR12: Company-wide WFH Periods**
- FR12.1: Admins must declare date ranges as company-wide WFH periods
- FR12.2: Global WFH periods can include optional notes (e.g., "Remote work week")
- FR12.3: Headcount reporting must check global WFH periods and flag active periods
- FR12.4: Individual employee WFH settings must be overridden by globalWFH periods
- FR12.5: Admins can edit and delete global WFH periods 

**FR13: Enhanced Headcount Reporting**
- FR13.1: Headcount reports must display totals by meal type (existing functionality)
- FR13.2: Headcount reports must display team-wise breakdown (total meals per team)
- FR13.3: Headcount reports must display overall total (sum of all meal types)
- FR13.4: Headcount reports must display office vs WFH split
- FR13.5: Reports must account for global WFH periods in office/WFH calculations

**FR14: Daily Announcement Generation**
- FR14.1: Admin/Logistics must generate copy-paste friendly announcement for selected date
- FR14.2: Announcement must include: date, meal totals, office/WFH split, special occasion notes
- FR14.3: Announcement must include team breakdown 
- FR14.4: Announcement must display in textarea with copy button

**FR15: Live Dashboard Updates**
- FR15.1: Headcount reports must auto-refresh without relaoding when any meal status changes by any user


**FR16: Auditability in Daily Participation View**
- FR16.1: The Daily Participation table (visible to Team Lead and Admin) must display a "Last Modified By" column showing the `name` of the user who last updated each meal record (null/system if cron-generated or self-edited)
- FR16.2: The Daily Participation table must display a "Modified At" column showing the `updatedAt` timestamp of each meal record
- FR16.3: Backend must resolve `lastModifiedBy` user ID to the corresponding user's name before returning it in the daily participation response
- FR16.4: These audit fields must reflect the most recent change — whether made by the employee, a Team Lead, or an Admin

**FR17: Special Occasion Badge on Headcount View**
- FR17.1: When a `MealSchedule` record exists for the selected date and has an `occasionName` set, the Headcount tab must display a visible badge or banner showing that occasion name
- FR17.2: The occasion badge must appear prominently near the date picker / top of the headcount card area
- FR17.3: Backend `GET /api/admin/headcount` must include `occasionName` in its response (null if no schedule or no name set)

**FR18: WFH Over-Limit Indicators in Daily Participation**
- FR18.1: The Daily Participation table must include a "WFH Taken" column showing each employee's WFH day count for the current month
- FR18.2: If an employee's monthly WFH count exceeds 5 days, the value in the "WFH Taken" column must be displayed in red to indicate over-limit status
- FR18.3: Above the Daily Participation table, two summary cards must be displayed:
  - **"WFH Limit Exceeded"**: count of employees whose monthly WFH > 5
  - **"Total Extra WFH Days"**: sum of (wfhCount - 5) for all employees who are over the limit
- FR18.4: The 5-day monthly WFH allowance is a soft limit — records beyond the limit are still accepted; this is for visibility only
- FR18.5: Backend `GET /api/admin/daily-participation` must return `wfhCount` (monthly WFH days) per employee in its response

**FR19: WFH Over-Limit Filter in Daily Participation**
- FR19.1: A filter button ("Show Over-Limit Only") must appear above the Daily Participation table
- FR19.2: When the filter is active, only employees whose monthly WFH count exceeds 5 are shown in the table
- FR19.3: The filter can be toggled on/off without a new API call (client-side filtering of already-loaded data)
- FR19.4: The filter button must have a visible active/inactive state indicator



### 4.2 Non-Functional Requirements

**NFR2: Security**
- NFR2.1: All passwords must be hashed using bcrypt (salt rounds ≥10)
- NFR2.2: JWT tokens must be stored in HTTP-only cookies
- NFR2.3: All API endpoints must require authentication except login
- NFR2.4: System must validate user permissions on every request

**NFR3: Reliability**
- NFR3.1: System uptime must be ≥99%
- NFR3.2: Cron job failures must not prevent manual system use
- NFR3.3: System must gracefully handle database connection failures

**NFR4: Usability**
- NFR4.1: Employees must be able to update meals with minimum clicks
- NFR4.2: UI must provide immediate visual feedback for all actions
- NFR4.3: Error messages must be clear and actionable

**NFR5: Maintainability**
- NFR5.1: Codebase must follow TypeScript best practices
- NFR5.2: API endpoints must be RESTful and well-documented
- NFR5.3: Database schema must support future feature additions without breaking changes
- NFR5.4: System must log errors for debugging and monitoring

**NFR6: Scalability**
- NFR6.1: Database design must support growth to 500+ employees
- NFR6.2: System architecture must allow horizontal scaling if needed
- NFR6.3: Frontend must be optimized for low-bandwidth environments

---

## 5. Tech Stack and Rationale

### 5.1 Technology Choices

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Frontend** | React.js + TypeScript | 18.x | - Industry standard for web UIs<br>- Strong TypeScript support<br>- Large ecosystem and community<br>- Team familiarity |
| **Styling** | Tailwind CSS | 3.x | - Rapid UI development<br>- Utility-first approach reduces CSS complexity<br>- Built-in responsive design<br>- Small production bundle |
| **State Management** | TanStack Query (React Query) | 5.x | - Automatic caching and refetching<br>- Optimistic updates out-of-box<br>- Server state synchronization<br>- Reduces boilerplate vs Redux |
| **Backend** | Node.js + Express | 20.x / 4.x | - JavaScript/TypeScript full-stack consistency<br>- Fast API development<br>- Mature ecosystem<br>- Team expertise |
| **Database** | PostgreSQL | 15.x | - **Local**: Runs locally using Docker<br> - **Reliable**: ACID compliance for data integrity |
| **ORM** | Prisma | 5.x | - Type-safe database queries<br>- Automatic TypeScript types generation<br>- Migration-free with `db push` for rapid iteration<br>- Built-in connection pooling |
| **Authentication** | JWT + HTTP-only Cookies | - | - Stateless authentication<br>- XSS protection via HTTP-only flag<br>- CSRF protection via SameSite attribute<br>- No session storage needed |
| **Password Hashing** | bcrypt | 5.x | - Industry standard for password security<br>- Adjustable cost factor (future-proof)<br>- Salt generation built-in |
| **Automation** | node-cron | 3.x | - Simple cron syntax<br>- Runs in-process (no external scheduler)<br>- Timezone support |
| **Validation** | express-validator | 7.x | - Express integration<br>- Comprehensive validation rules<br>- Sanitization built-in |
| **Rate Limiting** | express-rate-limit | 7.x | -  Prevents DoS/Brute-force attacks<br>- Simple middleware integration<br>- Supports custom stores (Redis, Memcached)|
| **Date Handling** | date-fns | 3.x | - Lightweight (vs Moment.js)<br>- Modular imports<br>- Immutable date operations<br>- TypeScript native |

### 5.2 Why PostgreSQL With Prisma and Docker?

**Decision Rationale:**
1. **Environment Consistency**: Docker ensures the database version and configuration are identical for all developers, eliminating "it works on my machine" bugs.

2. **Data Sovereignty**: Local hosting keeps sensitive employee data within the controlled environment, satisfying privacy requirements and supervisor constraints.

3. **Type Safety:** Prisma ORM provides auto-generated TypeScript types, reducing runtime errors during development.

4. **Zero Latency:** Local execution removes network delays associated with cloud providers like Neon.



**Alternative Considered:**
- **Cloud PostgreSQL (Neon/RDS)**: Rejected due to external infrastructure dependency and data privacy constraints.
- **SQLite**: Rejected due to lack of concurrent write support and production limitations
- **MongoDB**: Rejected due to relational data model (Users → Teams → MealRecords)

### 5.3 Why TypeScript?

**Benefits:**
1. **Type Safety**: Catch errors at compile-time instead of runtime
2. **IDE Support**: Better autocomplete and refactoring
3. **Prisma Integration**: Automatic type generation from database schema
4. **Team Collaboration**: Self-documenting code with explicit types
5. **Scalability**: Easier to refactor as codebase grows


---

## 6. User Flows

### 6.1 Employee Daily Flow

**Actor:** Employee (John)
**Goal:** Update meal participation for tomorrow

**Steps:**
1. John opens MHP application and logs in with email/password
2. System validates credentials and sets JWT cookie
3. Dashboard loads showing:
   - Monthly stats card: "18 Meals Taken This Month"
   - 7-day grid with checkboxes for Lunch, Snacks for each day
4. John sees tomorrow (Feb 7) has both Lunch and Snacks checked (default opt-in)
5. John unchecks "Snacks" for tomorrow because he's in a meeting
6. System immediately saves the change with visual feedback (checkmark → unchecked)
7. John closes browser (session persists for 7 days)

**Alternative Flow: Adding Future Meals**
1. John knows he's on vacation next Wednesday
2. John clicks "Add Future Meal" button
3. Selects date: Feb 12 (5 days from now)
4. Unchecks all meals for that day
5. System creates MealRecord with all meals = false
7. When cron runs on Feb 11 at 9 PM, it skips John for Feb 12 (record exists)

---

### 6.2 Team Lead Proxy Edit Flow

**Actor:** Team Lead (Sarah)
**Goal:** Opt out an employee who forgot to update their meals

**Steps:**
1. Employee (John) messages Sarah: "I'm sick tomorrow, forgot to opt out of meals"
2. Sarah logs into MHP and navigates to Team Lead dashboard
3. Sarah searches for "John" in team member search bar
4. System displays John's profile card (only team members shown)
5. Sarah clicks on John's card
6. Modal opens showing John's 7-day meal grid
7. Sarah unchecks all meals for tomorrow (Feb 7)
8. Sarah clicks "Save"
9. System updates MealRecord:
   - Sets all meals = false for Feb 7
   - Sets lastModifiedBy = Sarah's user ID
   - Sets notificationSent = false (for future notification feature)
10. Modal closes with success message: "Meals updated for John"
11. (Future iteration) John receives email: "Your meals for Feb 7 were updated by Sarah"

**Access Control Validation:**
- If Sarah tries to search for an employee from another team, system returns empty results
- Backend middleware validates teamId matches before allowing proxy edit

---

### 6.3 Admin Special Occasion Flow

**Actor:** Admin (Alice)
**Goal:** Set up Event Dinner for company annual party

**Steps:**
1. Alice logs into Admin dashboard
2. Clicks "Schedule Management" tab
3. Clicks "Create Special Occasion" button
4. Fills form:
   - **Date**: March 15, 2025
   - **Occasion Name**: "Company Annual Celebration"
   - **Lunch**: Enabled (checked)
   - **Snacks**: Enabled (checked)
   - **Iftar**: Disabled (unchecked)
   - **Event Dinner**: Enabled (checked) – Special meal
   - **Optional Dinner**: Disabled (unchecked)
5. Clicks "Save"
6. System creates MealSchedule record for March 15
7. Success message: "Special occasion created for March 15"
8. **Cron Job Impact**:
   - On March 14 at 9 PM, cron job runs
   - Fetches MealSchedule for March 15
   - Creates MealRecords with eventDinner = true for all active employees
9. **Employee Experience**:
   - All employees see "Event Dinner" checkbox on March 15
   - Purple badge displays: "Company Annual Celebration"
   - Employees can opt out if not attending

---

### 6.4 Logistics Daily Reporting Flow

**Actor:** Logistics Manager (Maria)
**Goal:** Get headcount for today's meals to send to chef

**Steps:**
1. Maria logs into Logistics dashboard at 9:00 AM
2. Dashboard displays headcount cards for today (Feb 7):
   - **Lunch**: 95 people
   - **Snacks**: 87 people
   - **Iftar**: 0 people (not available today)
   - **Event Dinner**: 0 people (not available today)
   - **Optional Dinner**: 12 people
   - **Total Employees**: 105 people
3. Maria calls chef with numbers
4. (Future iteration) Maria clicks "Export CSV" and emails report to chef

**Historical Reporting:**
1. Maria needs to check last Friday's headcount
2. Clicks date picker, selects Feb 2
3. System refetches data for Feb 2 and displays counts
4. Maria reviews historical data for trend analysis

---

### 6.5 Daily Cron Job Flow (System Process)

**Actor:** System (automated)
**Goal:** Create meal records for tomorrow for all active employees

**Steps:**

1. **Trigger**: System clock reaches 09:00 PM server time

2. **Calculate Date**: Determine tomorrow's date (e.g., Feb 7)

3. **Fetch Active Users**: Query database for all users with status = ACTIVE (e.g. returns 105 users)

4. **Check Schedule**:
   - Query MealSchedule table for Feb 7
   - If found: Use configured meals by admin as defaults (e.g. Lunch=true, Snacks=false, Iftar=true, others=null)
   - If not found: Use system defaults (Lunch=true, Snacks=true, others=null)

5. **For Each User**:
   - Check if MealRecord exists for `userId + Feb 7`

   **If record does NOT exist:**
   - Create new MealRecord with meal defaults coming from step 4
   - Set lastModifiedBy = null (system-generated)
   - Set notificationSent = false

   **If record DOES exist:**
   - For each meal column (lunch, snacks, iftar, eventDinner, optionalDinner):
     - **If column is `null`**: Apply values from meal defaults coming from step 4
     - **If column is `true` or `false`**: Skip (preserve user's explicit decision)

6. **Log Results**:
   - Created 82 new records
   - Updated 15 records with new special events (only `null` columns)
   - Skipped 23 users (all meals already decided, no `null` values)

7. **Special Case**:
    - When a user dont want to participate in any meals including special ones, he can click **All meals off** button, it will create a row where for all mealtypes value will be false.
    - Any special occasion (even those occassions added after his selection) will be ignored during cron jobs.


**Edge Cases Handled:**
  - If cron fails, employees can still manually add records
  - Duplicate prevention via unique constraint (userId + date)
  - Transaction rollback if bulk insert fails
  - Special events added after user's meal selection are handled gracefully via three-state nullable boolean pattern.

### 6.6 Employee WFH Selection Flow

**Actor:** Employee (John)
**Goal:** Mark himself as WFH for tomorrow

**Steps:**
1. John opens his 7-day meal grid
2. For tomorrow's row, he sees two buttons: "All Off" and "WFH"
3. John clicks "WFH" button
4. System creates/updates MealRecord:
   - Sets workFromHome = true
   - Sets all meals (lunch, snacks, iftar, eventDinner, optionalDinner) = false
5. All meal checkboxes are unchecked
6. Change saves immediately with optimistic update

**Alternative: Employee Already Set Meals, Then Changes to WFH**
1. John already selected lunch=true, snacks=false for tomorrow
2. John clicks "WFH" button
3. System overwrites all meal selections to false (regardless of previous state)
4. workFromHome flag set to true

---

### 6.7 Team Lead Bulk Update Flow

**Actor:** Team Lead (Sarah)
**Goal:** Mark entire team as WFH for a specific date due to team offsite

**Steps:**
1. Sarah logs into Team Lead dashboard
2. Clicks "Today's Team Participation" tab
3. Selects date: Feb 10 (within valid window)
4. System displays all team members in table with:
   - Checkboxes for selection
   - Name, Team, Location columns
   - Meal columns (Lunch, Snacks, Iftar, Event Dinner, Optional Dinner)
5. Sarah sees bulk action buttons at top (hidden if date is past/today)
6. Sarah checks "Select All" checkbox (selects all 8 team members)
7. Sarah clicks "WFH for All" bulk action button
8. System sends bulk update request to backend
9. Backend validates:
   - Sarah's role (LEAD)
   - All selected users belong to Sarah's team
   - Date is within valid window
10. Backend uses transaction to update all 8 MealRecords:
    - Sets workFromHome = true
    - Sets all meals = false
    - Sets lastModifiedBy = Sarah's user ID
11. Success message: "8 employees updated to WFH"
12. Table refreshes showing blue WFH badges and all meals unchecked

**Access Control:**
- If Sarah tries to bulk edit another team's members, backend returns 403
- Middleware checks teamId match before allowing operation

---

### 6.8 Admin Global WFH Period Flow

**Actor:** Admin (Alice)
**Goal:** Declare company-wide WFH period for a week

**Steps:**
1. Alice logs into Admin dashboard
2. Clicks "Global WFH" tab
3. Sees form: "Declare Company-wide WFH Period"
4. Fills form:
   - **Date From**: March 1, 2025
   - **Date To**: March 7, 2025
   - **Note**: "Remote work week - Office renovation"
5. Clicks "Apply WFH Period" button
6. System creates GlobalWFHPeriod record
7. Success message: "Global WFH period created for Mar 1 - Mar 7"
8. Period appears in "Active & Upcoming WFH Periods" table below
9. **Impact on Headcount Reporting**:
   - Any date from March 1-7: Headcount report shows "Global WFH Period Active"
   - Office/WFH split calculation accounts for global period
   - Daily announcement includes note: "Remote work week - Office renovation"

**Deletion:**
1. Alice finds period in table
2. Clicks "Delete" button
3. Confirmation modal shows and Confirms deletion
4. GlobalWFHPeriod record deleted
5. Future headcount reports no longer show global WFH flag

---


### 6.9 Logistics Daily Announcement Flow

**Actor:** Logistics Manager (Maria)
**Goal:** Generate announcement for today's meal headcount

**Steps:**
1. Maria logs into Logistics dashboard
2. Clicks "Headcount Reports" tab
3. Selects today's date
4. Reviews headcount cards showing:
   - Meal totals: Lunch (85), Snacks (78), etc.
   - Team breakdown: Engineering [total (120 meals), Lunch (85), Snacks (78), etc], Marketing[total (20 meals), Lunch (12), Snacks (4), etc], etc.
   - Office/WFH split: Office (92), WFH (13)
   - Overall total: 195 meals
5. Clicks "Generate Announcement" button
6. Modal appears with pre-formatted message:

```
📅 Daily Meal Headcount - Monday, February 17, 2026

🎉 Special Occasion: Company Annual Celebration [if exist]

🍽️ Meal Headcount:
   🍱 Lunch: 85 people
   🍪 Snacks: 78 people
   🍽️ Optional Dinner: 12 people

📊 Total Meals: 175

📍 Work Location:
   🏢 Office: 92 people
   🏠 WFH: 13 people

👥 Team Breakdown:
   Engineering: 120 meals
   Marketing: 45 meals
   Operations: 30 meals
```

7. Maria clicks "Copy" button
8. System copies message to clipboard

---


### 6.10 Admin/Lead Viewing Audit Trail and WFH Over-Limit Report

**Actor:** Admin (Alice) or Team Lead (Sarah)
**Goal:** Identify who changed a participation entry and flag employees over WFH limit

**Steps:**
1. Alice logs into Admin dashboard and navigates to "Daily Participation" tab
2. Selects today's date
3. System fetches participation data including:
   - Per-employee WFH count for the current month
   - Last modifier name and timestamp for each meal record
4. Table displays all employees with columns:
   - Name, Team, Location, Meal checkboxes, **WFH Taken**, **Last Modified By**, **Modified At**
5. Alice notices John's "WFH Taken" value is **7** — shown in red (over 5-day limit)
6. Alice sees "Last Modified By: Sarah (Team Lead)" and "Modified At: Feb 19, 10:32 AM" on John's row — confirming Sarah made the most recent change
7. Above the table, two summary cards show:
   - **WFH Limit Exceeded**: 3 employees
   - **Total Extra WFH Days**: 5 days
8. Alice clicks "Show Over-Limit Only" filter button
9. Table immediately narrows to show only the 3 employees exceeding the WFH allowance
10. Alice clicks "Show Over-Limit Only" again to clear the filter and see all employees

**Occasion Badge Flow:**
1. Alice switches to "Headcount Reports" tab
2. Selects March 15 (a date with a special occasion schedule)
3. System shows the standard headcount cards
4. A purple badge reads: **🎉 Company Annual Celebration** — displayed above the headcount cards
5. Alice confirms the occasion is active before generating the daily announcement



---

## 7. Design

### 7.1 System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│                   (React + TypeScript + Tailwind)                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │    Employee    │  │   Team Lead    │  │     Admin      │   │
│  │   Dashboard    │  │   Dashboard    │  │   Dashboard    │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              Logistics Dashboard                       │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS / REST API
┌──────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│                   (Node.js + Express + TypeScript)               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │     Auth     │  │     Meal     │  │    Admin     │         │
│  │     API      │  │     API      │  │     API      │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              Middleware Layer                          │    │
│  │  • Authentication (JWT)                                │    │
│  │  • Authorization (Role-based)                          │    │
│  │  • Validation (express-validator)                      │    │
│  │  • Error Handling                                      │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓ Prisma ORM
┌──────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                              │
│                   (PostgreSQL on Docker)                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────┐  ┌────────┐  ┌──────────────────┐  ┌─────────────────┐        │
│  │ User │  │ Team │  │ MealSchedule │  │ MealRecord  │        │
│  └────────┘  └────────┘  └──────────────────┘  └─────────────────┘        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                    AUTOMATION LAYER                              │
│                        (node-cron)                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Daily Job (9 PM): Create tomorrow's meal records           │
│  • Respect existing user-created records                        │
│  • Apply meal schedule rules                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 Database Schema Design

**Entity Relationship Overview:**

```
┌─────────────┐
│    User     │
├─────────────┤
│ id (PK)     ├───┐
│ email       │   │
│ password    │   │
│ role        │   │
│ status      │   │
│ teamId (FK) ├───┼────────┐
└─────────────┘   │       │
                  │       │
                  │   ┌───┴─────────┐
                  │   │   Team   │
                  │   ├────────────┤
                  │   │ id (PK)  │
                  │   │ name     │
                  │   │ leadId   ├───┐ (FK to User)
                  │   └────────────┘
                  │
                  │
                  │   ┌────────────────────┐
                  └───►  MealRecord    │
                      ├────────────────────┤
                      │ id (PK)        │
                      │ userId (FK)    │
                      │ date           │
                      │ lunch          │
                      │ snacks         │
                      │ iftar          │
                      │ eventDinner    │
                      │ optionalDinner │
                      │ workFromHome   │
                      │ lastModifiedBy │
                      └────────────────────┘

                      ┌──────────────────────┐
                      │   MealSchedule     │
                      ├──────────────────────┤
                      │ id (PK)            │
                      │ date (UNIQUE)      │
                      │ lunchEnabled       │
                      │ snacksEnabled      │
                      │ iftarEnabled       │
                      │ eventDinnerEnabled │
                      │ occasionName       │
                      │ createdBy          │
                      └──────────────────────┘


                      ┌──────────────────────┐
                      │   GlobalWFHPeriod    │
                      ├──────────────────────┤
                      │ id (PK)              │
                      │ dateFrom             │
                      │ dateTo               │
                      │ note                 │
                      │ createdAt            │
                      │ updatedAt            │
                      │ createdBy            │
                      └──────────────────────┘
```

**Table Descriptions:**

**User Table:**
- Stores employee information and credentials
- Fields: id, name, email, password (hashed), role (EMPLOYEE/LEAD/ADMIN/LOGISTICS), status (ACTIVE/INACTIVE), teamId
- Password Management: Passwords hashed with bcrypt before storage
- Account Creation: New users created by Admin with auto-generated or custom password
- Future Enhancement: Password reset via email link (requires notification system)
- Single role per user (no combined roles)
- If User is deactivated via status = INACTIVE, it will preserves historical data
- If a user is permanently deleted, it does not preserves historical data.
- Team assignment enables Team Lead access control

**Team Table:**
- Organizes employees into teams with designated leads
- Fields: id, name, leadId (FK to User)
- leadId is unique (one Lead per team)
- Self-referential relationship: Team Lead is also a User with role=LEAD

**MealSchedule Table:**
- Exception-only configuration for special occasions
- Fields: date (unique), meal availability flags (boolean), occasionName, createdBy
- Only created when deviating from defaults (Lunch=true, Snacks=true, others=false)
- If no record exists for a date, system uses hardcoded defaults
- Example use cases: Ramadan (Iftar enabled), company events (Event Dinner enabled)

**MealRecord Table:**
- Stores individual employee meal participation
- Fields: id, userId (FK), date, meal participation flags (boolean), workFromHome, lastModifiedBy, updatedAt, notificationSent
- `lastModifiedBy`: tracks who last changed the record — null means cron-generated or self-edited; a non-null value is the userId of the Team Lead or Admin who made the change
- `updatedAt`: Prisma auto-managed timestamp — updated on every write. Now surfaced in the Daily Participation view to provide a full audit trail
- Both `lastModifiedBy` and `updatedAt` were present in the schema since Iteration 1; they are **newly exposed** in the daily participation API response in Iteration 3
- Unique constraint: (userId, date) prevents duplicates
- lastModifiedBy tracks proxy edits (null = self-edit, otherwise Team Lead/Admin ID)
- notificationSent prepared for future notification feature (false = notification pending)
- All meal booleans default to false in schema; actual defaults set by cron job

**Index Strategy:**
- User: email, teamId, status (optimize lookups and filtering)
- Team: leadId (optimize Team Lead queries)
- MealSchedule: date (optimize daily schedule lookups)
- MealRecord: date, userId (optimize headcount queries and user schedule retrieval)

### 7.3 API Design

**RESTful Endpoint Structure:**

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | All | Login with email/password |
| POST | `/api/auth/logout` | All | Clear authentication cookie |
| GET | `/api/auth/me` | All | Get current users profile |
| GET | `/api/meals/my-schedule` | Employee+ | Get 7-day meal grid |
| PATCH | `/api/meals/my-record` | Employee+ | Add/update own meals |
| GET | `/api/meals/my-stats` | Employee+ | Get monthly consumption |
| GET | `/api/admin/team/members` | Lead+ | Get team member list |
| GET | `/api/admin/employee/:userId/schedule` | Lead+ | View employee's schedule |
| PATCH | `/api/admin/employee/:userId/record` | Lead+ | Proxy edit employee meals |
| GET | `/api/admin/employees` | Admin | Search all employees |
| POST | `/api/admin/meal-schedule` | Admin | Create special occasion |
| GET | `/api/admin/meal-schedule/today` | Admin | Get all schedules for today |
| GET | `/api/admin/meal-schedule/:id` | Admin | Get a specific schedule exception |
| DELETE | `/api/admin/meal-schedule/:id` | Admin | Remove schedule exception |
| GET | `/api/admin/headcount` | Admin, Logistics | Get daily headcount |
| POST   | `/api/admin/users`            | Admin | Create new user account |
| PATCH  | `/api/admin/users/:userId`    | Admin | Update user details (name, role, team, status) |
| GET    | `/api/admin/users/:userId`    | Admin | Get user details |
| DELETE | `/api/admin/users/:userId`    | Admin | Delete a user account |
| GET | `/api/admin/daily-participation?date=YYYY-MM-DD` | LEAD, ADMIN | Get daily participation (team-filtered for LEAD) |
| POST | `/api/admin/meals/bulk-update` | LEAD, ADMIN | Bulk update meals for selected employees |
| POST | `/api/admin/global-wfh` | ADMIN | Create company-wide WFH period |
| GET | `/api/admin/global-wfh` | ADMIN | Get all global WFH periods |
| DELETE | `/api/admin/global-wfh/:id` | ADMIN | Delete global WFH period |
| POST | `/api/admin/generate-announcement` | ADMIN, LOGISTICS | Generate daily announcement message |
| GET | `/api/admin/daily-participation?date=YYYY-MM-DD` | LEAD, ADMIN | Get daily participation (team-filtered for LEAD). **[Iter 3]** Now also returns per-employee `wfhCount` (monthly WFH days), `lastModifiedByName` (resolved user name or null), and `updatedAt` |
| GET | `/api/admin/headcount?date=YYYY-MM-DD` | ADMIN, LOGISTICS | Get daily headcount. **[Iter 3]** Now also returns `occasionName` (from MealSchedule for that date, or null) |


**Sample Request/Response:**

```json
// PATCH /api/meals/my-record
// Request:
{
  "date": "2025-02-08",
  "lunch": true,
  "snacks": false,
  "iftar": false,
  "eventDinner": false,
  "optionalDinner": false
}

// Response:
{
  "success": true,
  "record": {
    "id": 123,
    "userId": 45,
    "date": "2025-02-08",
    "lunch": true,
    "snacks": false,
    "iftar": false,
    "eventDinner": false,
    "optionalDinner": false,
    "lastModifiedBy": null,
    "updatedAt": "2025-02-06T14:30:00Z"
  }
}
```



### 7.4 Frontend Component Hierarchy

```
App
├── AuthProvider
│   └── ProtectedRoute
│       ├── EmployeeDashboard
│       │   ├── TeamBadge  
│       │   ├── MonthlyStatsCard
│       │   └── SevenDayGrid
│       │       └── DayRow
│       │           ├── MealCheckbox
│       │           ├── AllOffButton
│       │           ├── WFHButton  
│       │           └── WFHBadge 
│       │
│       ├── TeamLeadDashboard  
│       │   └── Tabs  
│       │       ├── My Meals Tab
│       │       │   └── SevenDayGrid
│       │       │       └── DayRow
│       │       │           ├── MealCheckbox
│       │       │           ├── AllOffButton
│       │       │           ├── WFHButton  
│       │       │           └── WFHBadge  
│       │       │
│       │       ├── Team Participation Tab  
│       │       │   └── DailyParticipationTab (teamScope=true)
│       │       │       ├── DatePicker
│       │       │       ├── StatusMessage (read-only/editable)
│       │       │       ├── WFHSummaryCards 
│       │       │       │   ├── WFHLimitExceededCard
│       │       │       │   └── TotalExtraWFHDaysCard
│       │       │       ├── OverLimitFilterButton 
│       │       │       ├── BulkActionsToolbar (if editable)
│       │       │       │   ├── WFH for All Button
│       │       │       │   ├── All Off Button
│       │       │       │   ├── Set All Meals Button
│       │       │       │   └── Unset All Meals Button
│       │       │       └── EmployeeTable
│       │       │           └── EmployeeRow
│       │       │               ├── SelectCheckbox
│       │       │               ├── Name
│       │       │               ├── LocationBadge (Office/WFH)
│       │       │               ├── MealColumns (5 meal types)
│       │       │               ├── WFHTakenColumn  (red if > 5)
│       │       │               ├── LastModifiedByColumn 
│       │       │               └── ModifiedAtColumn 
│       │       │
│       │       └── Search & Edit Tab
│       │           └── EmployeeProxyTab
│       │               ├── TeamMemberSearch
│       │               ├── TeamMemberList
│       │               │   └── MemberCard
│       │               └── EmployeeEditModal
│       │                   └── SevenDayGrid
│       │
│       ├── AdminDashboard  
│       │   └── Tabs
│       │       ├── My Meals Tab
│       │       │   └── SevenDayGrid
│       │       │
│       │       ├── UserManagementTab
│       │       │   ├── CreateUserButton → CreateUserModal
│       │       │   │   └── UserForm
│       │       │   ├── UserListTable
│       │       │   │   └── UserRow
│       │       │   │       ├── EditButton → EditUserModal
│       │       │   │       ├── DeactivateButton
│       │       │   │       └── DeleteButton (soft delete)
│       │       │   └── BulkActionsToolbar
│       │       │
│       │       ├── ScheduleManagementTab  
│       │       │   ├── CreateScheduleButton → CreateScheduleModal
│       │       │   │   └── ScheduleForm
│       │       │   │       ├── DatePicker
│       │       │   │       ├── SpecialDayTypeDropdown
│       │       │   │       │   ├── Office Closed
│       │       │   │       │   ├── Government Holiday
│       │       │   │       │   ├── Special Celebration
│       │       │   │       │   └── Custom (shows text input)
│       │       │   │       └── MealToggles
│       │       │   ├── ScheduleListTable
│       │       │   │   └── ScheduleRow
│       │       │   │       ├── EditButton → EditScheduleModal
│       │       │   │       └── DeleteButton
│       │       │   └── UpcomingEventList
│       │       │
│       │       ├── EmployeeProxyTab
│       │       │   ├── EmployeeSearchBar
│       │       │   ├── EmployeeListTable
│       │       │   └── EmployeeEditModal
│       │       │       └── SevenDayGrid
│       │       │
│       │       ├── HeadcountReportsTab
│       │       │   ├── DatePicker
│       │       │   ├── GlobalWFHBanner (if active)
│       │       │   ├── OccasionBadge  (if occasionName exists for date)
│       │       │   ├── TotalEmployeesCard
│       │       │   ├── MealHeadcountCards (5 meal types)
│       │       │   ├── TeamBreakdownCards  
│       │       │   │   └── TeamCard
│       │       │   │       ├── TeamName
│       │       │   │       ├── TotalMeals
│       │       │   │       └── MealTypeBreakdown
│       │       │   │           ├── Lunch count
│       │       │   │           ├── Snacks count
│       │       │   │           ├── Iftar count
│       │       │   │           ├── Event Dinner count
│       │       │   │           └── Optional Dinner count
│       │       │   ├── OfficeWFHSplitCards
│       │       │   │   ├── OfficeCard
│       │       │   │   └── WFHCard
│       │       │   ├── OverallTotalCard
│       │       │   └── GenerateAnnouncementButton
│       │       │       └── AnnouncementModal
│       │       │           ├── MessageTextArea
│       │       │           └── CopyButton
│       │       │
│       │       ├── Daily Participation Tab  
│       │       │   └── DailyParticipationTab (teamScope=false)
│       │       │       ├── DatePicker
│       │       │       ├── StatusMessage (read-only/editable)
│       │       │       ├── WFHSummaryCards 
│       │       │       │   ├── WFHLimitExceededCard
│       │       │       │   └── TotalExtraWFHDaysCard
│       │       │       ├── OverLimitFilterButton 
│       │       │       ├── BulkActionsToolbar (if editable)
│       │       │       │   ├── WFH for All Button
│       │       │       │   ├── All Off Button
│       │       │       │   ├── Set All Meals Button
│       │       │       │   └── Unset All Meals Button
│       │       │       └── EmployeeTable (all employees)
│       │       │           └── EmployeeRow
│       │       │               ├── SelectCheckbox
│       │       │               ├── Name
│       │       │               ├── Team
│       │       │               ├── LocationBadge (Office/WFH)
│       │       │               ├── MealColumns (5 meal types)
│       │       │               ├── WFHTakenColumn  (red if > 5)
│       │       │               ├── LastModifiedByColumn 
│       │       │               └── ModifiedAtColumn 
│       │       │
│       │       └── Global WFH Tab
│       │           └── GlobalWFHTab
│       │               ├── CreateWFHPeriodForm
│       │               │   ├── DateFromPicker
│       │               │   ├── DateToPicker
│       │               │   ├── NoteInput
│       │               │   └── ApplyButton
│       │               └── WFHPeriodsTable
│       │                   └── WFHPeriodRow
│       │                       ├── DateFrom
│       │                       ├── DateTo
│       │                       ├── Note
│       │                       └── DeleteButton
│       │
│       └── LogisticsDashboard  
│           ├── DatePicker
│           ├── GlobalWFHBanner (if active)
│           ├── OccasionBadge  (if occasionName exists for date)
│           ├── MealHeadcountCards
│           ├── TeamBreakdownCards
│           ├── OfficeWFHSplitCards
│           ├── OverallTotalCard
│           └── GenerateAnnouncementButton
│
└── LoginPage
    └── LoginForm
```


---

## 8. Key Decisions and Trade-offs

### 8.1 Default Opt-In vs Opt-Out

**Decision:** Implement Default Opt-In (all employees assumed attending unless they opt out)

**Rationale:**
- **Reduces cognitive load**: Employees only act when NOT attending
- **Minimizes data entry**: 80% of employees attend most meals → 80% fewer clicks
- **Better default**: Logistics prefers over-count (extra food) vs under-count (not enough food)

**Trade-off:**
- Risk: Employees who forget to opt out cause food waste
- Mitigation: Monthly analytics show participation trends; system can flag chronic non-responders in future iteration

**Alternative Considered:**
- Opt-Out by default: Rejected because it creates massive data entry burden (every employee clicks every day)

---

### 8.2 Eager Record Creation (Daily Cron) vs Lazy Creation (On-Demand)

**Decision:** Implement Eager Record Creation with daily cron job at 9 PM

**Rationale:**
- **Simplifies headcount logic**: All records exist in advance → simple COUNT(*) query
- **Enables "skip if exists" behavior**: User-created records preserved automatically
- **Better UX**: Employees see their default state immediately (all meals checked)

**Trade-off:**
- **Database size**: Creates ~100 records/day
- **Cron dependency**: System relies on scheduled job (but manual override always possible)

**Alternative Considered:**
- Lazy Creation (create record only when user opts out):
  - **Pro**: Minimal database writes
  - **Con**: Headcount calculation becomes complex (totalUsers - optOutCount)
  - **Con**: Cannot track "who hasn't responded" vs "who opted in by default"

**Mitigation:**
- Cron failure does NOT break system (users can manually add records)
- Database cleanup job can archive old records (future iteration)

---

### 8.3 7-Day Window vs Longer Planning Horizon

**Decision:** Limit planning window to tomorrow through next 6 days (7 days total, excluding today)

**Rationale:**
- **Logistics constraints**: Catering vendor needs 1-day notice → today's meals cannot be changed
- **Reduces cognitive load**: 7 days is manageable; 30 days would overwhelm employees
- **Aligns with work patterns**: Most employees know their schedule ~1 week ahead

**Trade-off:**
- Cannot plan for vacations >7 days in advance
- Employees must remember to update again if schedule changes

**Alternative Considered:**
- 14-day or 30-day window: Rejected due to increased complexity and low user demand

**Future Enhancement:**
- Allow admins to extend window for specific dates (e.g., major holidays)

---

### 8.4 Single Role per User vs Combined Roles

**Decision:** Enforce single role per user (no user can be both LEAD and ADMIN)

**Rationale:**
- **Simplifies permission logic**: No need to merge role permissions
- **Clearer audit trail**: Always know who acted in which capacity
- **Easier to reason about**: Binary role checks instead of conditional logic

**Trade-off:**
- **Flexibility**: CEO who wants both admin and team management needs separate accounts
- **Data redundancy**: Person with multiple roles appears as multiple users

**Alternative Considered:**
- Role array (e.g., `roles: ['EMPLOYEE', 'LEAD']`):
  - **Pro**: More flexible
  - **Con**: Complex permission merging (what if LEAD and LOGISTICS roles conflict?)

**Mitigation:**
- For iteration 1, single role is sufficient
- Future iteration can add role hierarchy or permission system

---


### 8.5 Notification Architecture (Future-Ready)

**Decision:** Add notification metadata fields now (`lastModifiedBy`, `notificationSent`) but implement notification logic in Iteration 2

**Rationale:**
- **No schema changes later**: Avoids database migration when adding notifications
- **Defers complexity**: Email/SMS infrastructure not needed for MVP
- **Data ready**: When notifications go live, historical data already has metadata

**Trade-off:**
- **Unused fields**: Fields exist but aren't used yet (minor storage overhead)

**Alternative Considered:**
- Add fields later: Rejected because it would require backfilling historical data

---

## 9. Security and Access Control

### 9.1 Authentication

**JWT Cookie-Based Authentication:**
- **Token Generation**: JWT signed with secret key (HS256 algorithm)
- **Token Payload**: Contains userId, email, role, teamId
- **Token Expiration**: 7 days (configurable)
- **Storage**: HTTP-only cookie (prevents XSS attacks)
- **Cookie Attributes**:
  - `httpOnly: true` → JavaScript cannot access (XSS protection)
  - `secure: true` → HTTPS only in production
  - `sameSite: 'strict'` → CSRF protection
- **Refresh Strategy**: No refresh tokens in iteration 1; user must re-login after 7 days

**Login Flow:**
1. User submits email/password
2. Backend validates credentials (bcrypt hash comparison)
3. Backend generates JWT with user claims
4. JWT stored in cookie, sent with all subsequent requests
5. Middleware validates JWT on every protected endpoint

**Rate Limiting:**
- Login endpoint limited to 5 attempts per 15 minutes per IP
- Prevents brute force attacks

### 9.2 Password Security

**Hashing Strategy:**
- **Algorithm**: bcrypt with salt rounds = 10
- **Process**:
  1. User creates account with plain password
  2. Backend generates random salt
  3. bcrypt hashes password + salt (10 rounds = ~100ms)
  4. Only hash stored in database
- **Validation**:
  1. User submits plain password at login
  2. Backend retrieves hash from database
  3. bcrypt compares plain password to hash
  4. Match = authentication success

**Why bcrypt:**
- Industry standard for password hashing
- Adaptive cost factor (can increase rounds as hardware improves)
- Built-in salt generation (prevents rainbow table attacks)

**Password Requirements:**
- Minimum length: 8 characters (enforced at frontend)
- No complexity requirements for iteration 1 (improve UX)

### 9.3 Authorization (Role-Based Access Control)

**Middleware Stack:**
1. **Authentication Middleware**: Validates JWT, extracts user claims
2. **Role Authorization Middleware**: Checks if user role is allowed
3. **Team Access Middleware**: Validates team membership for proxy operations

**Permission Enforcement:**

```
Request Flow:
Client → authenticate() → requireRole(['LEAD', 'ADMIN']) → requireTeamAccess() → Controller
         ↓                ↓                                    ↓
         Verify JWT      Check user.role in allowedRoles     Validate teamId match
         Extract user                                        (if not ADMIN)
```

**Example: Team Lead Proxy Edit**
- Endpoint: `PATCH /api/admin/employee/:userId/record`
- Middleware chain:
  1. `authenticate()` → Verify JWT exists and is valid
  2. `requireRole('LEAD', 'ADMIN')` → Reject if user role is EMPLOYEE or LOGISTICS
  3. `requireTeamAccess()` → If role is LEAD, validate target user is in same team
- Result: Team Leads can only edit their team; Admins bypass team check

**Role Permissions (Summary):**
- **EMPLOYEE**: Self-service only (own meals, own stats)
- **LEAD**: Team scope (view/edit team members)
- **ADMIN**: Global scope (all employees, schedule management)
- **LOGISTICS**: Read-only (headcount reports)

### 9.4 Input Validation

**Validation Strategy:**
- **Library**: express-validator
- **Validation Points**:
  1. Request body validation (JSON payloads)
  2. Query parameter validation (date ranges, search terms)
  3. URL parameter validation (user IDs, schedule IDs)

**Example Validations:**
- **Email**: Must be valid email format
- **Password**: Minimum 8 characters
- **Date**: Must be ISO 8601 format, converted to Date object
- **Boolean fields**: Must be `true` or `false` (reject strings like "yes")
- **Meal date**: Must be within valid window (tomorrow through next 6 days)

**SQL Injection Prevention:**
- **Prisma ORM**: All queries automatically parameterized
- No raw SQL string concatenation
- Type-safe query builder prevents injection


### 9.5 Data Privacy

**Sensitive Data Handling:**
- **Passwords**: Never logged, never transmitted in responses
- **JWT tokens**: Never exposed to client-side JavaScript (HTTP-only cookies)
- **User emails**: Visible only to authorized roles (Admins, own user)

**Audit Trail:**
- **lastModifiedBy field**: Tracks who edited each meal record
- **Timestamps**: createdAt, updatedAt on all tables
- **Future enhancement**: Comprehensive audit log table for compliance

### 9.6 Production Security Checklist

**Environment Variables:**
- `JWT_SECRET`: Strong random secret (>32 characters)
- `DATABASE_URL`: Connection string with strong password
- `NODE_ENV`: Set to "production" (enables security features)

**HTTPS Enforcement:**
- All production traffic over HTTPS (TLS 1.2+)
- HSTS headers to prevent downgrade attacks

**CORS Configuration:**
- Restrict `Access-Control-Allow-Origin` to frontend domain only
- Credentials: true (allows cookies)

---

## 10. Testing Plan

### 10.1 Unit Testing

**Scope:** Individual functions and utilities in isolation

**Tools:**
- **Framework**: Jest
- **Coverage Target**: >80% for critical business logic

**Test Areas:**

**A. Date Utilities (`dateHelpers.ts`)**
- `getTomorrow()`: Returns correct date (edge case: daylight saving time)
- `isDateInValidWindow()`: Correctly validates dates within tomorrow through next 6 days
- `getCurrentMonthRange()`: Returns correct month boundaries (edge case: January, December)

**B. JWT Utilities (`jwt.ts`)**
- `generateToken()`: Creates valid JWT with correct payload
- `verifyToken()`: Validates signature and expiration
- `verifyToken()`: Rejects expired tokens

**C. Meal Service Logic (`mealService.ts`)**
- `addOrUpdateMealRecord()`: Creates new record if none exists
- `addOrUpdateMealRecord()`: Updates existing record
- `addOrUpdateMealRecord()`: Rejects dates outside valid window
- `getMyStats()`: Correctly calculates total meals

**D. Cron Job Logic (`dailyRecordCreation.ts`)**
- Creates records for tomorrow with correct defaults
- Skips users who already have records (preserves preferences)
- Applies MealSchedule rules when present
- Uses hardcoded defaults when no schedule exists

**Sample Test:**
```typescript
describe('isDateInValidWindow', () => {
  it('should return true for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isDateInValidWindow(tomorrow)).toBe(true);
  });

  it('should return false for today', () => {
    const today = new Date();
    expect(isDateInValidWindow(today)).toBe(false);
  });

  it('should return false for 8 days from now', () => {
    const future = new Date();
    future.setDate(future.getDate() + 8);
    expect(isDateInValidWindow(future)).toBe(false);
  });
});
```

### 10.2 Integration Testing

**Scope:** API endpoints with database interactions

**Tools:**
- **Framework**: Supertest (HTTP assertions) + Jest
- **Database**: Separate test database on postgres

**Test Areas:**

**A. Authentication Flow**
- POST `/api/auth/login` with valid credentials returns JWT cookie
- POST `/api/auth/login` with invalid credentials returns 401
- POST `/api/auth/login` with rate limit exceeded returns 429
- GET `/api/auth/me` with valid JWT returns user profile
- GET `/api/auth/me` without JWT returns 401

**B. Employee Meal Management**
- GET `/api/meals/my-schedule` returns 7-day grid
- PATCH `/api/meals/my-record` updates meal record
- PATCH `/api/meals/my-record` with invalid date returns 400
- PATCH `/api/meals/my-record` for today returns 400 (cutoff passed)

**C. Team Lead Proxy Operations**
- Team Lead can view own team members
- Team Lead CANNOT view other team members
- Team Lead can edit own team member's meals
- Team Lead CANNOT edit other team's meals
- Proxy edit sets `lastModifiedBy` correctly

**D. Admin Operations**
- Admin can search all employees
- Admin can create MealSchedule
- Admin can edit any employee's meals
- Admin can view headcount

**E. Logistics Reporting**
- Logistics can view headcount
- Logistics CANNOT edit meals
- Headcount calculation is accurate

**Sample Test:**
```typescript
describe('POST /api/meals/my-record', () => {
  let authCookie: string;

  beforeAll(async () => {
    // Login and get JWT cookie
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'employee@test.com', password: 'test123' });
    authCookie = res.headers['set-cookie'][0];
  });

  it('should update meal record for valid date', async () => {
    const tomorrow = getTomorrow();
    const res = await request(app)
      .patch('/api/meals/my-record')
      .set('Cookie', authCookie)
      .send({
        date: tomorrow.toISOString(),
        lunch: false,
        snacks: true,
        iftar: false,
        eventDinner: false,
        optionalDinner: false
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.record.lunch).toBe(false);
  });

  it('should reject update for today', async () => {
    const today = new Date();
    const res = await request(app)
      .patch('/api/meals/my-record')
      .set('Cookie', authCookie)
      .send({
        date: today.toISOString(),
        lunch: false,
        // ... other fields
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('tomorrow through next 6 days');
  });
});
```

### 10.3 Manual Testing

#### A. Employee Checklist

**Authentication & Access**
- ☐ Employee can log in with valid credentials.
- ☐ Invalid login returns proper error message.
- ☐ Employee cannot access Admin/Lead/Logistics endpoints (403).
- ☐ Session persists correctly for configured duration.
- ☐ Logout clears authentication cookie.

**Meal Viewing & Selection**
- ☐ Employee can view 7-day meal grid.
- ☐ Today's meals cannot be edited.
- ☐ Only valid planning window (tomorrow → next 6 days) is editable.
- ☐ Only meal types defined in `meal_schedule` appear for selected date.
- ☐ Default meals (Lunch, Snacks) appear when no special schedule exists.
- ☐ Special events appear when scheduled.
- ☐ Employee can toggle individual meal types.
- ☐ Selection creates or updates a MealRecord correctly.
- ☐ "All Off" sets all meal columns to `false`.
- ☐ UI reflects saved state immediately.
- ☐ Invalid payload (wrong date/format) shows proper error.



#### B. Team Lead Checklist

**Access Scope**
- ☐ Lead can log in and access Lead dashboard.
- ☐ Lead can view only their assigned team members.
- ☐ Lead cannot access members from other teams.
- ☐ Direct API access to another team's member returns 403.

**Proxy Meal Management**
- ☐ Lead can open a team member's meal schedule.
- ☐ Lead can update team member meal selections.
- ☐ Proxy update respects date window rules.
- ☐ Proxy edit correctly sets `lastModifiedBy` to Lead ID.
- ☐ "All Off" works correctly in proxy mode.
- ☐ Special events appear correctly in member view.
- ☐ Changes are reflected in headcount reporting.



#### C. Admin Checklist

**User Management**
- ☐ Admin can create new user with valid data.
- ☐ Required fields validation works.
- ☐ Duplicate email creation is prevented.
- ☐ Admin can update user details (name, role, team, status).
- ☐ Admin can deactivate user (status = INACTIVE).
- ☐ Inactive users do not appear in meal planning.
- ☐ Admin can delete user.
- ☐ Deleted user cannot log in.

**Schedule Management**
- ☐ Admin can create MealSchedule for a date.
- ☐ Admin can enable/disable specific meal types.
- ☐ Admin can set occasion name.
- ☐ Schedule changes reflect in UI immediately.
- ☐ Admin can delete schedule exception.
- ☐ System falls back to default meals when schedule is removed.

**Global Permissions**
- ☐ Admin can access all employees across teams.
- ☐ Admin can proxy edit any employee.
- ☐ Admin-only endpoints are blocked for non-admin roles.



#### D. Logistics Checklist

**Reporting Access**
- ☐ Logistics can log in and access reporting dashboard.
- ☐ Logistics can view daily headcount.
- ☐ Logistics can select historical dates.
- ☐ Headcount values are accurate per meal type.
- ☐ Logistics cannot edit meals.
- ☐ Logistics cannot access user management endpoints.


#### E. System & Automation Checklist

**Cron Job Behavior**
- ☐ Cron creates MealRecord if none exists.
- ☐ Cron does not overwrite `true` or `false` values.
- ☐ Cron updates only `null` columns.
- ☐ Cron applies MealSchedule rules when present.
- ☐ Cron uses default rules when no schedule exists.
- ☐ No duplicate records are created.
- ☐ Cron handles special event added after user selection correctly.
- ☐ "All Off" records remain unchanged after cron.
- ☐ Cron execution is logged.



#### F. Data Integrity & Edge Cases

- ☐ Unique constraint prevents duplicate (userId + date).
- ☐ Invalid `userId` returns proper error.
- ☐ Invalid date format returns 400.
- ☐ System handles concurrent updates safely.
- ☐ Deactivated users are excluded from cron processing.
- ☐ Headcount excludes inactive and deleted users.


#### G. Iteration 3 — Auditability, WFH Indicators & Occasion Badge

**Auditability Columns (FR16)**
- ☐ Daily Participation table shows "Last Modified By" column for all rows
- ☐ Rows edited by a Team Lead show that Lead's name (not null, not "system")
- ☐ Rows edited by Admin show Admin's name
- ☐ Rows created by cron job show null / "—" in "Last Modified By"
- ☐ "Modified At" column shows correct timestamp for each row
- ☐ After a proxy edit, "Last Modified By" and "Modified At" update correctly in the table

**Occasion Badge on Headcount Tab (FR17)**
- ☐ When no MealSchedule exists for selected date, no occasion badge is shown
- ☐ When MealSchedule exists but occasionName is null, no badge is shown
- ☐ When MealSchedule has occasionName set, badge displays correctly with the occasion name
- ☐ Badge disappears if the MealSchedule is deleted for that date

**WFH Over-Limit Indicators (FR18)**
- ☐ "WFH Taken" column in Daily Participation table shows correct monthly WFH count per employee
- ☐ Employees with WFH count ≤ 5 show count in normal text
- ☐ Employees with WFH count > 5 show count highlighted in red
- ☐ "WFH Limit Exceeded" summary card shows correct count of over-limit employees
- ☐ "Total Extra WFH Days" summary card shows correct total of excess days
- ☐ Summary cards update if date is changed (WFH count is per current month, not per selected date)

**WFH Over-Limit Filter (FR19)**
- ☐ "Show Over-Limit Only" filter button is visible above the table
- ☐ Clicking the filter shows only employees with WFH count > 5
- ☐ Clicking the filter again clears it and shows all employees
- ☐ Filter button has a visible active state when engaged
- ☐ Filter works correctly when combined with date changes
- ☐ No additional API call is made when toggling the filter (client-side filtering)



## 11. Operations

### 11.1 Deployment Architecture

**Hosting Environment:**
- **Backend**: cloud run / Vercel / Railway / Render (Node.js hosting)
- **Frontend**: cloud run / Vercel / Netlify (Static hosting with CDN)
- **Database**: cloud run / aws

**Environment Separation:**
- **Development**: Local backend + postgres dev database
- **Staging**: Deployed backend + postgres staging database (separate instance)
- **Production**: Deployed backend + postgres production database

### 11.2 Environment Variables

**Backend (.env):**
```
DATABASE_URL=postgresql://user:pass@postgres-prod.com/mhp_db
JWT_SECRET=<strong-random-secret-32-chars>
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://mhp.company.com
```

**Frontend (.env):**
```
VITE_API_URL=https://api.mhp.company.com
VITE_ENV=production
```

### 11.3 Database Management

**Schema Updates:**
1. Update `schema.prisma` in development
2. Run `npx prisma db push` to staging database
3. Test thoroughly in staging environment
4. Run `npx prisma db push` to production database
5. Monitor for errors

**Data Cleanup:**
- **Old MealRecords**: Archive records older than 90 days (future job)
- **Inactive Users**: Soft delete by setting status = INACTIVE (preserve historical data)


### 11.4 Cron Job Scheduling

**Production Setup:**
- **In-Process**: node-cron runs inside backend process (simple, no external scheduler)
- **Alternative**: External cron (crontab) triggers API endpoint (more reliable if backend restarts)

**Production Configuration:**
```javascript
// Option 1: In-process (current implementation)
cron.schedule('0 0 * * *', createTomorrowRecords, {
  timezone: 'Asia/Dhaka'  // Adjust to company timezone
});

// Option 2: External cron hits endpoint
// crontab: 0 0 * * * curl -X POST http://localhost:5000/api/admin/cron/create-records
```

**Failure Handling:**
- If cron fails, manual fallback: Admin can trigger "Create Records" button
- Idempotent design: Re-running cron is safe (skip duplicates)

### 11.5 Disaster Recovery

**Scenarios and Plans:**

**A. Database Corruption**
- Restore from manual weekly export
- Estimated downtime: <1 hour

**B. Backend Server Failure**
- Redeploy to new server instance
- Update DNS if needed
- Estimated downtime: <15 minutes (if using Vercel/Railway auto-scaling)

**C. Data Loss (Accidental Deletion)**
- Admin accidentally deletes MealSchedule: Restore from database backup
- Employee accidentally opts out: Team Lead can correct via proxy edit

### 11.7 Maintenance Windows

**Scheduled Maintenance:**
- **Frequency**: Monthly once
- **Activities**:
  - Apply security patches
  - Update dependencies
  - Database vacuum/analyze (optimize performance)
  - Review logs and metrics
- **Notification**: Email to all users 3 days in advance

**Emergency Maintenance:**
- Critical security patches applied immediately
- Notify users via in-app banner


---

## 12. Risks, Assumptions, and Open Questions

### 12.1 Risks

**R1: Cron Job Failure**
- **Description**: Daily cron job fails to create records, employees have nothing to edit
- **Likelihood**: Low (simple job, no external dependencies)
- **Impact**: High (system becomes unusable for the day)
- **Mitigation**:
  - Monitoring alert if job doesn't complete by 09:15 PM
  - Manual fallback: Admin can trigger record creation via button
  - Employees can always manually add records (system doesn't fully break)

**R2: Database Connection Pool Exhaustion**
- **Description**: 100 concurrent users may exhaust connection limit
- **Likelihood**: Medium (if all employees log in simultaneously)
- **Impact**: Medium (API requests fail with 500 errors)
- **Mitigation**:
  - Implement connection pooling in Prisma (reuse connections)
  - Implement request queuing (retry logic)


**R3: Timezone Confusion**
- **Description**: Cron job runs at midnight UTC instead of local time, creates records for wrong day
- **Likelihood**: Low (timezone configured in cron)
- **Impact**: High (all employees see wrong dates)
- **Mitigation**:
  - Explicitly set timezone in cron configuration
  - Test cron in staging with manual time adjustment
  - Monitor first week of production for anomalies


**R5: Security Breach**
- **Description**: Attacker gains access to admin account
- **Likelihood**: Low (bcrypt hashing, JWT auth)
- **Impact**: High (can modify all meal records)
- **Mitigation**:
  - Enforce strong password policy
  - Implement 2FA in future iteration
  - Audit log to detect suspicious activity
  - Rate limiting on login endpoint

### 12.2 Assumptions

**A1: Employee Internet Access**
- **Assumption**: All employees have reliable internet access during work hours
- **If false**: System unusable; would need offline-first mobile app

**A2: Single Office Location**
- **Assumption**: All employees work in same office with same chef
- **If false**: Would need multi-location support (out of scope for iteration 1)

**A3: No Dietary Restrictions Tracking**
- **Assumption**: Catering vendor handles dietary needs separately
- **If false**: Would need meal preference fields in database

**A5: Desktop-First Usage**
- **Assumption**: Most employees use desktop/laptop during work hours
- **If false**: Would need mobile-optimized UI (responsive design mitigates partially)

**A6: Stable Team Structure**
- **Assumption**: Team assignments and Team Leads change infrequently (<1x per quarter)
- **If false**: Would need more flexible role reassignment UI

**A7: Trust-Based System**
- **Assumption**: Employees are honest about meal participation (no QR code check-in)
- **If false**: Would need attendance verification system


### 12.3 Open Questions

**Q1: Notification Delivery Method**
- **Question**: When implementing notifications (iteration 2), should we use email, SMS, or in-app notifications?
- **Decision Needed By**: End of iteration 1
- **Stakeholders**: Logistics team, employees
- **Impact**: Affects infrastructure setup (email service, SMS gateway)

**Q2: Data Retention Policy**
- **Question**: How long should we keep historical meal records? (90 days, 1 year, indefinitely?)
- **Decision Needed By**: Month 3 of production
- **Stakeholders**: Legal team, logistics team
- **Impact**: Affects database storage and archival strategy

**Q3: Headcount Export Format**
- **Question**: What format does catering vendor prefer? (CSV, PDF, email?)
- **Decision Needed By**: End of iteration 1
- **Stakeholders**: Logistics team, catering vendor
- **Impact**: Affects export functionality design


**Q4: Analytics Dashboard**
- **Question**: What additional metrics would be valuable? (meal waste trends, per-team consumption, cost tracking)
- **Decision Needed By**: Iteration 2 planning
- **Stakeholders**: Finance team, logistics team
- **Impact**: Affects future feature roadmap

**Q5: Scalability Threshold**
- **Question**: At what employee count should we consider upgrading infrastructure? (200? 500?)
- **Decision Needed By**: When growth projections available
- **Stakeholders**: CTO, finance team
- **Impact**: Affects budget and architecture decisions

---

## 13. Success Metrics and KPIs

### 13.1 Launch Success Criteria

- **Adoption**: ≥80% of employees create accounts and use system daily
- **Accuracy**: Headcount variance ≤1% compared to actual attendance
- **Stability**: Zero critical bugs causing system downtime

### 13.2 Ongoing Success Metrics
- Logistics team time savings: Target 90% time saving (from hours to minutes)
- Headcount availability time: Target <5 minutes after 9 PM cutoff
- Cron job success rate: Target >99%
- Average time to update meals: Target <30 seconds per user
- API uptime: Target ≥99% during business hours

---
