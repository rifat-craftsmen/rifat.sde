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
