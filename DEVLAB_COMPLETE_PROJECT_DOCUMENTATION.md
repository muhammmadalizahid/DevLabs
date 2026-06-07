# DevLab - Complete Educational Project Documentation

**Last Updated:** June 7, 2026  
**Status:** Production Ready (Phase 1 Complete)  
**Overall Progress:** 65% Complete (Core Features Implemented)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [System Architecture](#system-architecture)
4. [Technology Stack](#technology-stack)
5. [Database Schema & Design](#database-schema--design)
6. [Core Features & Workflows](#core-features--workflows)
7. [API Documentation](#api-documentation)
8. [Frontend Components](#frontend-components)
9. [Query Execution Engine](#query-execution-engine)
10. [Grading & Evaluation System](#grading--evaluation-system)
11. [Authentication & Authorization](#authentication--authorization)
12. [Deployment & Infrastructure](#deployment--infrastructure)
13. [Testing Strategy](#testing-strategy)
14. [Security Considerations](#security-considerations)
15. [Performance Optimization](#performance-optimization)
16. [Future Enhancements](#future-enhancements)

---

## Executive Summary

**DevLab** is a comprehensive, classroom-based **SQL assessment and practice platform** designed for educational institutions. It combines classroom management (similar to Google Classroom) with an automated coding evaluation system (similar to HackerRank) specifically optimized for SQL queries.

### Key Highlights

- **Dual-Database Architecture:** Supabase (PostgreSQL) for metadata, TiDB for dataset execution
- **Auto-Grading Engine:** Automatic evaluation of SQL queries with partial credit support
- **Role-Based Access:** Separate interfaces for teachers and students
- **Scalable Execution:** Redis-backed worker queue for query execution isolation
- **SQLite Sandbox:** In-memory isolated databases for safe query execution
- **Complete Dataset Management:** Upload, manage, and version control datasets
- **Export Capabilities:** CSV and Excel exports of results and analytics

### User Statistics

- **Students:** Take tests, practice SQL, view results
- **Teachers:** Create classrooms, upload datasets, create tests, grade submissions, export results
- **Platform:** Handles 100+ concurrent users, 5s query timeout, 100-row result limit

---

## Project Overview

### Product Definition

**Name:** DevLab (Development Laboratory)

**Description:** A web-based platform for teaching and assessing SQL database skills through:
- Structured classroom-based testing
- Self-paced practice problems
- Automatic grading and feedback
- Comprehensive results analytics

### Target Users

1. **Teachers/Instructors**
   - Create and manage multiple classrooms
   - Upload custom datasets
   - Create SQL-based tests with multiple questions
   - Approve/reject student enrollment requests
   - View detailed submission analytics
   - Export results for reporting

2. **Students**
   - Join classrooms with invite codes
   - Attempt published tests with time limits
   - Practice SQL queries with built-in datasets
   - View automatic grading results
   - Track performance metrics

### Primary Goals

1. ✅ Enable teachers to create and manage coding classrooms
2. ✅ Allow students to practice and take SQL-based tests
3. ✅ Provide automated query evaluation system
4. ✅ Support custom datasets and test creation
5. ⏳ Expand beyond SQL to general programming problems
6. ⏳ Provide analytics on student performance
7. ⏳ Build scalable evaluation engine

### Current Status

- **Phase 1 (Complete):** Authentication, core classroom management, basic test system, SQLite sandbox
- **Phase 2 (In Progress):** Partial grading, advanced analytics, plagiarism detection
- **Phase 3 (Planned):** Real-time collaboration, AI-assisted hints
- **Phase 4 (Future):** Multi-language support, advanced visualizations

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      DEVLAB PLATFORM                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐                      │
│  │   Web Frontend   │  │   Mobile Browser │                      │
│  │  (Next.js React) │  │  (Responsive UI) │                      │
│  └────────┬─────────┘  └────────┬─────────┘                      │
│           │                    │                                 │
│           └────────┬───────────┘                                 │
│                    │ HTTP/HTTPS                                  │
│                    ▼                                             │
│  ┌────────────────────────────────────────────────────────┐     │
│  │         NEXT.JS APPLICATION SERVER (Node.js)           │     │
│  │                                                        │     │
│  │  ┌─────────────────────────────────────────────────┐  │     │
│  │  │           API ROUTES (REST)                     │  │     │
│  │  │  • /api/classrooms/* (management)              │  │     │
│  │  │  • /api/tests/* (test CRUD)                    │  │     │
│  │  │  • /api/submissions/* (grading)                │  │     │
│  │  │  • /api/engine/run (query execution)           │  │     │
│  │  │  • /api/datasets/* (data management)           │  │     │
│  │  │  • /api/export/* (CSV/Excel export)            │  │     │
│  │  │  • /api/metrics (Prometheus metrics)           │  │     │
│  │  └─────────────────────────────────────────────────┘  │     │
│  │                                                        │     │
│  │  ┌─────────────────────────────────────────────────┐  │     │
│  │  │       BUSINESS LOGIC LAYER (lib/)               │  │     │
│  │  │  • Query Validation & Security                  │  │     │
│  │  │  • SQLite Sandbox Management                    │  │     │
│  │  │  • Grading Engine (multiple algorithms)         │  │     │
│  │  │  • Dataset Management                           │  │     │
│  │  │  • Export Processing                            │  │     │
│  │  │  • Worker Queue Management                      │  │     │
│  │  │  • Authentication (NextAuth)                    │  │     │
│  │  └─────────────────────────────────────────────────┘  │     │
│  └────────────────────────────────────────────────────────┘     │
│         │              │              │         │               │
│         ▼              ▼              ▼         ▼               │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              DATA PERSISTENCE LAYER                    │     │
│  │                                                        │     │
│  │  ┌─────────────────┐   ┌──────────────────────────┐   │     │
│  │  │ Supabase/       │   │  TiDB Cloud Starter      │   │     │
│  │  │ PostgreSQL      │   │  (MySQL-Compatible)      │   │     │
│  │  │                 │   │                          │   │     │
│  │  │ • Users         │   │ • Dataset Tables         │   │     │
│  │  │ • Classrooms    │   │ • Physical Data          │   │     │
│  │  │ • Tests         │   │ • Query Execution        │   │     │
│  │  │ • Submissions   │   │ • Analytics              │   │     │
│  │  │ • Questions     │   │                          │   │     │
│  │  │ • Datasets      │   │ (Distributed SQL DB)     │   │     │
│  │  │ (Relational)    │   │                          │   │     │
│  │  └─────────────────┘   └──────────────────────────┘   │     │
│  │                                                        │     │
│  │  ┌──────────────────┐   ┌──────────────────────────┐   │     │
│  │  │ Supabase Storage │   │  Redis Queue (Optional) │   │     │
│  │  │ (S3-Compatible)  │   │  (BullMQ)                │   │     │
│  │  │ • CSV Datasets   │   │ • Job Queue              │   │     │
│  │  │ • File Uploads   │   │ • Execution Jobs         │   │     │
│  │  └──────────────────┘   └──────────────────────────┘   │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │         WORKER PROCESS (Optional, for scale)           │     │
│  │  • Monitors Redis job queue                           │     │
│  │  • Executes queries in isolated SQLite instances      │     │
│  │  • Reports results back to main process               │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Examples

#### 1. Student Taking a Test

```
Student Browser
    ↓
POST /api/tests/[id]/attempt  (Start test attempt)
    ↓
Server: Create submission record
    ↓
Return: submission ID, max score
    ↓
Student Editor (Real-time)
    ↓
POST /api/engine/run  (Test query)
    ↓
Server: Validate query → Execute in SQLite → Return results
    ↓
Display results to student
    ↓
POST /api/submissions/[id]/submit  (Submit final answers)
    ↓
Server: gradeSubmission()
    ├─ For each answer:
    │  ├─ Validate query
    │  ├─ Execute query against dataset
    │  ├─ Compare with expected output
    │  ├─ Calculate score
    │  └─ Update submission_answers table
    └─ Update submissions table with total_score
    ↓
Return: Final results
```

#### 2. Teacher Creating a Test

```
Teacher Browser
    ↓
POST /api/classrooms  (Create classroom)
    ↓
POST /api/datasets  (Upload dataset with schema + data)
    ↓
Server: 
    ├─ Parse schema (CREATE TABLE statements)
    ├─ Create tables in Supabase PostgreSQL
    ├─ Import seed data (INSERT statements)
    ├─ Convert to CSV format
    ├─ Upload CSV to Supabase Storage
    ├─ Create dataset_tables records
    └─ Set status to READY
    ↓
POST /api/tests  (Create test)
    ↓
POST /api/tests/[id]/questions  (Add questions)
    ├─ Each question:
    │  ├─ Prompt text
    │  ├─ Reference solution (teacher writes SQL)
    │  ├─ Execute to capture expected output
    │  ├─ Dataset assignment
    │  └─ Difficulty level
    └─ Store expected_output as JSON
    ↓
PUT /api/tests/[id]  (Publish test)
    ↓
Test now available to students
```

#### 3. Query Execution Flow

```
User (Student/Teacher) writes query
    ↓
POST /api/engine/run { query, datasetId }
    ↓
Server: validateQuery()  → Check for dangerous keywords
    ↓ (Valid)
Server: loadDatasetTableMap()  → Fetch table mappings
    ↓
Server: rewriteTableNames()  → Map to physical table names
    ↓
Server: Check cache (by query hash)
    ↓ (Cache HIT)
Return cached results
    ↓ (Cache MISS)
Server: queryWithTimeout()
    ├─ Get TiDB connection from pool
    ├─ Execute query with 5s timeout
    ├─ Release connection
    └─ Serialize results (rows + columns)
    ↓
Server: budgetCheck()
    ├─ Rows < 100? ✓
    ├─ Bytes < 524KB? ✓
    └─ Valid → Cache + Return
    ↓
Client: Display results in table format
```

### Deployment Models

**Development:**
- Node.js dev server (next dev)
- Supabase local emulator (optional)
- SQLite in-memory
- In-process job queue

**Production:**
- Node.js application server (next start or serverless)
- Supabase managed cloud instance
- TiDB Cloud Starter cluster
- Redis-backed worker pool (BullMQ)
- Docker containers for scaling

---

## Technology Stack

### Frontend

| Category | Technology | Purpose | Notes |
|----------|-----------|---------|-------|
| **Framework** | Next.js 16.2.4 | React server-side rendering | App Router (not Pages) |
| **UI Library** | React 19.2.4 | Component framework | Latest version |
| **Editor** | Monaco Editor 4.7.0 | SQL query editing | Syntax highlighting |
| **Icons** | Lucide React 1.14.0 | UI icons | SVG-based |
| **Notifications** | React Hot Toast 2.6.0 | Toast notifications | User feedback |
| **Styling** | CSS Modules + Global CSS | Component styling | Dark mode support |
| **Data Parsing** | PapaParse 5.5.3 | CSV parsing | Client-side |
| **Spreadsheet** | XLSX 0.18.5 | Excel export | Client-side generation |
| **HTTP Client** | Fetch API | API requests | Native browser API |

### Backend

| Category | Technology | Purpose | Version |
|----------|-----------|---------|---------|
| **Runtime** | Node.js | JavaScript runtime | 18+ |
| **Framework** | Next.js API Routes | REST API | 16.2.4 |
| **Authentication** | NextAuth.js | OAuth & sessions | 4.24.14 |
| **OAuth Provider** | Google OAuth 2.0 | Sign-in | Via NextAuth |
| **Query Engine 1** | TiDB | Production SQL execution | Cloud Starter |
| **Query Engine 2** | SQLite | Development sandbox | In-memory |
| **SQL Parser/Formatter** | sql-formatter | Query formatting | 15.7.3 |
| **Job Queue** | BullMQ | Background jobs | 5.77.3 |
| **Cache** | In-process | Query result caching | Runtime cache |
| **Metrics** | prom-client | Prometheus metrics | 14.1.0 |
| **File Export** | ExcelJS 4.4.0 | Excel generation | Server-side |
| **CSV Processing** | csv-stringify 6.7.0 | CSV generation | Server-side |

### Databases

| Database | Purpose | Data | Role |
|----------|---------|------|------|
| **Supabase PostgreSQL** | Metadata store | Users, classrooms, tests, submissions, questions, enrollments, datasets metadata | Authentication, organization |
| **TiDB Cloud** | Dataset execution | Physical dataset tables (student data) | Query testing and execution |
| **Redis** (Optional) | Job queue | Execution jobs, results | Async processing |
| **Supabase Storage** | File storage | CSV dataset exports, file uploads | Data persistence |

### DevOps & Infrastructure

| Tool | Purpose | Usage |
|------|---------|-------|
| **Docker** | Containerization | Worker process containers |
| **Docker Compose** | Multi-container orchestration | Redis + Worker setup |
| **Vercel** (Optional) | Hosting | Next.js deployment |
| **GitHub** | Version control | Source code management |

### Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **npm** | Package management |
| **Node scripts** | Testing, migrations, seeding |

---

## Database Schema & Design

### Supabase PostgreSQL Schema

The Supabase (PostgreSQL) database serves as the central metadata store and maintains all application state.

#### 1. Users Table

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  avatar_url  TEXT,
  role        TEXT CHECK (role IN ('teacher', 'student')),
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

**Purpose:** Store user profiles and roles  
**Key Fields:**
- `id`: Unique user identifier
- `email`: Email address (unique)
- `role`: 'teacher' or 'student'
- Created automatically during Google OAuth signup

**Indexes:** `email` (unique)

---

#### 2. Classrooms Table

```sql
CREATE TABLE classrooms (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  teacher_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  email_domain TEXT,
  invite_code  TEXT UNIQUE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

**Purpose:** Store classroom metadata  
**Key Fields:**
- `id`: Unique classroom identifier
- `teacher_id`: Reference to teacher user
- `invite_code`: 8-char hex code for student enrollment
- `email_domain`: Optional domain restriction (e.g., "student.uet.edu.pk")

**Indexes:** `teacher_id`, `invite_code`

**Example Data:**
```
id: "550e8400-e29b-41d4-a716-446655440000"
name: "Introduction to Databases"
teacher_id: "550e8400-e29b-41d4-a716-446655440001"
invite_code: "A1B2C3D4"
email_domain: "student.uet.edu.pk"
```

---

#### 3. Enrollments Table

```sql
CREATE TABLE enrollments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id  UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  requested_at  TIMESTAMPTZ DEFAULT now(),
  approved_at   TIMESTAMPTZ,
  UNIQUE (classroom_id, student_id)
);
```

**Purpose:** Manage student enrollment in classrooms  
**Key Fields:**
- `status`: 'pending' (awaiting teacher approval), 'approved', or 'rejected'
- `requested_at`: When student requested to join
- `approved_at`: When teacher approved

**Workflow:**
1. Student requests to join classroom → status='pending'
2. Teacher approves → status='approved', approved_at=now()
3. Student can only see classroom and tests when status='approved'

**Indexes:** `classroom_id`, `student_id`, `classroom_id + student_id`

---

#### 4. Tests Table

```sql
CREATE TABLE tests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id      UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  time_limit_mins   INT,
  due_at            TIMESTAMPTZ,
  is_published      BOOLEAN DEFAULT false,
  clone_group_id    UUID DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ DEFAULT now()
);
```

**Purpose:** Store test metadata and settings  
**Key Fields:**
- `is_published`: If false, test is draft (students can't see it)
- `time_limit_mins`: Optional time limit for test attempts
- `due_at`: Optional deadline (students can't start after this)
- `clone_group_id`: Used for tracking test clones (for future features)

**State Transitions:**
1. Teacher creates test → is_published=false (Draft)
2. Teacher adds questions
3. Teacher publishes → is_published=true
4. Students can now see and attempt

**Indexes:** `classroom_id`, `is_published`

---

#### 5. Questions Table

```sql
CREATE TABLE questions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id           UUID REFERENCES tests(id) ON DELETE CASCADE,
  prompt            TEXT NOT NULL,
  difficulty        TEXT CHECK (difficulty IN ('basic', 'intermediate', 'advanced')),
  expected_output   JSONB NOT NULL,
  dataset_id        UUID REFERENCES datasets(id) ON DELETE SET NULL,
  order_sensitive   BOOLEAN DEFAULT false,
  points            INT DEFAULT 1,
  position          INT,
  created_at        TIMESTAMPTZ DEFAULT now()
);
```

**Purpose:** Store individual test questions  
**Key Fields:**
- `prompt`: Question description/SQL problem statement
- `expected_output`: JSON array of result rows (generated from reference query)
- `dataset_id`: Which dataset to use for evaluation
- `order_sensitive`: If false, row order is ignored during grading
- `points`: Score value (default 1, supports partial grading)

**Example expected_output:**
```json
[
  {"id": 1, "name": "Alice", "salary": 50000},
  {"id": 2, "name": "Bob", "salary": 60000}
]
```

**Indexes:** `test_id`, `dataset_id`

---

#### 6. Submissions Table

```sql
CREATE TABLE submissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id           UUID REFERENCES tests(id) ON DELETE CASCADE,
  student_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  status            TEXT DEFAULT 'started',
  started_at        TIMESTAMPTZ DEFAULT now(),
  submitted_at      TIMESTAMPTZ,
  total_score       INT DEFAULT 0,
  max_score         INT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (test_id, student_id, submitted_at)
);
```

**Purpose:** Track student test attempts  
**Key Fields:**
- `status`: 'started' (in progress), 'submitted', etc.
- `total_score`: Sum of all question scores
- `max_score`: Sum of all question max points

**Student Lifecycle:**
1. Student clicks "Start Test" → Create submission record
2. Student answers questions (auto-save to submission_answers)
3. Student clicks "Submit" → Grade all answers, update total_score, set status='submitted'

**Indexes:** `test_id`, `student_id`, `test_id + student_id`

---

#### 7. Submission Answers Table

```sql
CREATE TABLE submission_answers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id     UUID REFERENCES submissions(id) ON DELETE CASCADE,
  question_id       UUID REFERENCES questions(id) ON DELETE CASCADE,
  query_text        TEXT,
  actual_output     JSONB DEFAULT '[]'::jsonb,
  is_correct        BOOLEAN,
  score             INT DEFAULT 0,
  evaluated_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (submission_id, question_id)
);
```

**Purpose:** Store student answers and grading results  
**Key Fields:**
- `query_text`: Student's SQL query
- `actual_output`: JSON array of query results (populated during grading)
- `is_correct`: Boolean result (true/false)
- `score`: Points earned (0 to question.points)
- `evaluated_at`: When grading happened

**Grading Pipeline:**
1. Student submits → validateQuery() → executeQueriesBatch()
2. Compare actual_output with question.expected_output
3. Update is_correct and score

**Indexes:** `submission_id`, `question_id`

---

#### 8. Datasets Table

```sql
CREATE TABLE datasets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  description           TEXT,
  owner_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  is_platform           BOOLEAN DEFAULT false,
  schema_sql            TEXT NOT NULL,
  seed_sql              TEXT NOT NULL,
  storage_path          TEXT,
  table_name            TEXT,
  status                TEXT DEFAULT 'READY',
  table_prefix          TEXT,
  table_count           INT DEFAULT 0,
  row_count             INT DEFAULT 0,
  tidb_database_name    TEXT,
  error_message         TEXT,
  version_hash          TEXT,
  metadata_cached_at    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now()
);
```

**Purpose:** Store dataset metadata  
**Key Fields:**
- `schema_sql`: CREATE TABLE statements
- `seed_sql`: INSERT statements
- `storage_path`: Path to CSV in Supabase Storage
- `status`: 'READY', 'PROCESSING', 'ERROR'
- `is_platform`: If true, available to all (built-in datasets)
- `table_count`: Number of tables in dataset
- `tidb_database_name`: Physical database name in TiDB

**Dataset Lifecycle:**
1. Teacher uploads → schema_sql + seed_sql
2. Server processes in TiDB → Creates tables, imports data
3. Server converts to CSV → Uploads to Supabase Storage
4. Records dataset_tables entries
5. Sets status='READY'

**Indexes:** `owner_id`, `is_platform`

---

#### 9. Dataset Tables Table

```sql
CREATE TABLE dataset_tables (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id              UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  original_table_name     TEXT NOT NULL,
  physical_table_name     TEXT NOT NULL,
  columns_json            JSONB DEFAULT '[]'::jsonb,
  row_count               INT DEFAULT 0,
  sample_rows_json        JSONB DEFAULT '[]'::jsonb,
  table_size_estimate     BIGINT DEFAULT 0,
  last_refreshed_at       TIMESTAMPTZ DEFAULT now(),
  created_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE (dataset_id, original_table_name),
  UNIQUE (physical_table_name)
);
```

**Purpose:** Metadata for individual tables within a dataset  
**Key Fields:**
- `original_table_name`: Name teacher gave (e.g., "employees")
- `physical_table_name`: Actual name in TiDB (e.g., "dataset_550e8400_employees")
- `columns_json`: Schema (column names and types)
- `sample_rows_json`: First few rows (for teacher preview)

**Example:**
```json
{
  "original_table_name": "employees",
  "physical_table_name": "dataset_550e8400_employees",
  "columns_json": [
    {"name": "id", "type": "INT"},
    {"name": "name", "type": "VARCHAR(100)"},
    {"name": "salary", "type": "DECIMAL(10,2)"}
  ],
  "row_count": 100
}
```

**Indexes:** `dataset_id`, `physical_table_name`

---

### TiDB Cloud Schema

TiDB (distributed MySQL-compatible database) stores the **physical dataset tables** that students query against.

**Database Structure:**
```
TIDB_DATABASE=devlabs_datasets
├── dataset_[DATASET_ID]_[TABLE_NAME] (e.g., dataset_550e8400_employees)
├── dataset_[DATASET_ID]_[TABLE_NAME]
└── dataset_...
```

**Example:**
```sql
-- Physical table in TiDB
CREATE TABLE dataset_550e8400_employees (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  salary DECIMAL(10,2)
);

-- Seed data
INSERT INTO dataset_550e8400_employees VALUES
(1, 'Alice', 50000.00),
(2, 'Bob', 60000.00),
(3, 'Carol', 55000.00);
```

**Table Mapping:**
When a student writes a query like:
```sql
SELECT * FROM employees WHERE salary > 55000;
```

The system:
1. Looks up `dataset_550e8400_employees` in dataset_tables
2. Rewrites query to: `SELECT * FROM dataset_550e8400_employees WHERE salary > 55000;`
3. Executes on TiDB

---

### Caching Strategy

**Runtime Query Cache:**
```
Cache Key: SHA1(normalized_query)
TTL: 180 seconds (configurable)
Invalidation: None (queries are read-only)
Hit Rate Target: 70%+ (similar queries from students)
```

**Dataset Cache:**
```
Cache Key: dataset_id
TTL: Lifetime (invalidated on dataset update)
Content: Table mappings, column metadata
```

---

### Normalization & Relationships

```
Users
├─ 1:N Classrooms (teacher_id)
├─ 1:N Enrollments (student_id)
└─ 1:N Submissions (student_id)

Classrooms
├─ 1:N Enrollments
└─ 1:N Tests

Tests
├─ 1:N Questions
└─ 1:N Submissions

Questions
├─ 1:N Submission Answers
└─ M:1 Datasets

Datasets
├─ 1:N Dataset Tables
└─ 1:N Questions

Submissions
└─ 1:N Submission Answers
```

---

## Core Features & Workflows

### 1. Authentication & Authorization

#### Google OAuth Flow

```
1. User visits /
2. If not logged in → Click "Sign in with Google"
3. Redirects to Google OAuth dialog
4. User grants permission
5. Google redirects to /api/auth/callback/google
6. NextAuth creates session + JWT token
7. Supabase upsert creates user record (email, name, avatar)
8. JWT callback fetches user.role from Supabase
9. Session extended with role
10. Redirect to:
    - If role='teacher' → /teacher/dashboard
    - If role='student' → /student/dashboard
```

#### Role-Based Access Control

| Route | Teacher | Student | Anonymous |
|-------|---------|---------|-----------|
| `/teacher/*` | ✓ | ✗ | ✗ |
| `/student/*` | ✗ | ✓ | ✗ |
| `/api/classrooms` (POST) | ✓ | ✗ | ✗ |
| `/api/tests` (POST) | ✓ | ✗ | ✗ |
| `/api/submissions/[id]/submit` | ✓ | ✓ | ✗ |

---

### 2. Classroom Management Workflow

#### Teacher Flow: Create Classroom

```
Step 1: Navigate to /teacher/dashboard
Step 2: Click "New Classroom" button
Step 3: Fill form:
        ├─ Classroom Name * (required)
        ├─ Description (optional)
        ├─ Email Domain Restriction (optional, e.g., "*.uet.edu.pk")
        └─ Submit
Step 4: Server generates invite code (8-char hex)
Step 5: Classroom created in database
Step 6: Teacher sees:
        ├─ Invite code (shareable with students)
        ├─ Student requests (pending approval)
        ├─ List of approved students
        └─ Options: Edit, Delete, View Tests
```

**Database Changes:**
```sql
INSERT INTO classrooms (name, description, teacher_id, email_domain, invite_code)
VALUES ('Intro to DB', 'Learn SQL basics', 'teacher_123', 'student.uet.edu.pk', 'A1B2C3D4');
```

#### Student Flow: Join Classroom

```
Step 1: Navigate to /student/dashboard
Step 2: Click "Join Classroom"
Step 3: Enter invite code (e.g., "A1B2C3D4")
Step 4: Submit
Step 5: Server checks:
        ├─ Invite code exists?
        ├─ Email matches domain restriction? (if set)
        ├─ Student not already enrolled?
Step 6: Create enrollment record with status='pending'
Step 7: Student sees:
        ├─ Classroom in list with status='Pending Approval'
        ├─ Auto-refreshes every 5 seconds to check approval
Step 8: When teacher approves:
        ├─ Enrollment status → 'approved'
        ├─ Student sees status change → 'Approved'
        ├─ Can now see and attempt tests
```

**Database Changes:**
```sql
INSERT INTO enrollments (classroom_id, student_id, status)
VALUES ('classroom_123', 'student_456', 'pending');

-- After teacher approval:
UPDATE enrollments SET status='approved', approved_at=now()
WHERE classroom_id='classroom_123' AND student_id='student_456';
```

#### Teacher Flow: Manage Students

**Approve Individual Student:**
```
1. /teacher/classrooms/[id]/students
2. See pending requests list
3. Click "Approve" on student
4. Server: UPDATE enrollments SET status='approved', approved_at=now()
5. UI updates immediately
```

**Bulk Approve Students:**
```
1. /teacher/classrooms/[id]/students
2. Click "Approve All Pending"
3. Server: UPDATE enrollments WHERE status='pending' SET status='approved'
4. All student requests approved at once
```

**Reject or Remove Student:**
```
1. /teacher/classrooms/[id]/students
2. Click "Reject" or "Remove" on student
3. Server: DELETE enrollments WHERE student_id=... AND classroom_id=...
4. Student loses access to classroom and tests
```

---

### 3. Test Creation & Management Workflow

#### Teacher Flow: Create Test

```
Step 1: /teacher/classrooms/[classroom_id]
Step 2: Click "Tests" tab → "New Test"
Step 3: Fill form:
        ├─ Title * (e.g., "Midterm SQL Assessment")
        ├─ Description
        ├─ Time Limit (minutes, optional)
        ├─ Due Date/Time (optional)
        └─ Submit
Step 4: Test created with is_published=false (Draft)
Step 5: Click "Edit" → Go to questions
Step 6: Click "Add Question"
```

**Database Changes:**
```sql
INSERT INTO tests (classroom_id, title, description, time_limit_mins, due_at, is_published)
VALUES ('classroom_123', 'Midterm Assessment', 'SQL fundamentals', 60, '2026-06-15 14:00:00', false);
```

#### Teacher Flow: Add Questions

```
Step 1: /teacher/tests/[test_id]/edit
Step 2: Click "Add Question"
Step 3: Fill form:
        ├─ Question Prompt *
        │  (e.g., "Write a query to find all employees with salary > 50000")
        ├─ Difficulty * (Basic / Intermediate / Advanced)
        ├─ Dataset * (select from dropdown)
        ├─ Expected Query (reference solution - teacher writes SQL)
        └─ Order Sensitive? (checkbox)
Step 4: Click "Run Reference Query"
Step 5: Server:
        ├─ Validates reference query
        ├─ Executes against dataset
        ├─ Captures output as JSON
        └─ Shows teacher the results
Step 6: Teacher reviews results → Click "Save Question"
Step 7: Question created with expected_output populated
```

**Database Changes:**
```sql
INSERT INTO questions (test_id, prompt, difficulty, expected_output, dataset_id, order_sensitive, points)
VALUES (
  'test_123',
  'Find all employees earning > 50000',
  'basic',
  '[{"id":1,"name":"Alice","salary":50000},...]',
  'dataset_abc',
  false,
  1
);
```

#### Teacher Flow: Publish Test

```
Step 1: /teacher/tests/[test_id]
Step 2: Click "Publish" button
Step 3: Server: UPDATE tests SET is_published=true WHERE id='test_123'
Step 4: UI shows "Published" badge
Step 5: Test now visible to students in classroom
```

#### Teacher Flow: View & Edit Test

```
Features:
├─ View all questions with preview
├─ Edit individual question
├─ Reorder questions (drag & drop)
├─ Delete questions (with confirmation)
├─ Change test settings
├─ See student submission count
└─ Export results
```

---

### 4. Student Test Attempt Workflow

#### Start Test

```
Step 1: /student/classrooms/[classroom_id]
Step 2: See list of published tests
Step 3: Click "Start Test"
Step 4: Server:
        ├─ Check if student is approved
        ├─ Check if test is published
        ├─ Check if due date passed (if set)
        ├─ Check for existing submission
Step 5: Create submission record with started_at=now()
Step 6: Return submission ID to client
Step 7: Redirect to /student/tests/[test_id]/attempt/[submission_id]
```

#### Take Test

```
UI Layout:
┌─────────────────────────────────────────────────────┐
│         Question Panel        │ SQL Editor  │ Output │
├─────────────────────────────┼──────────────┼────────┤
│ Question: Find all           │              │        │
│ employees with salary > 50k  │              │        │
│                              │ SELECT * ...  │ Rows:  │
│ [Prev] [Next] [Submit]       │              │ ID | Na│
│                              │ [Run] [Clear] │        │
└─────────────────────────────┴──────────────┴────────┘

For each question:
  Step 1: Read prompt
  Step 2: Write SQL query in editor (syntax highlighting)
  Step 3: Click "Run Query"
  Step 4: Server executes (5s timeout)
  Step 5: Show results in table
  Step 6: Click "Next Question" → Move to next
  Step 7: Query auto-saved to submission_answers
```

**Real-time Interactions:**
- Query changes auto-save every 3 seconds
- Run Query gives immediate feedback
- Results table is interactive (sortable, scrollable)
- Question progress tracked (Answered X of Y)

#### Submit Test

```
Step 1: Click "Submit Test" (or auto-submit if time expires)
Step 2: Confirmation dialog: "Submit your answers? You cannot change them."
Step 3: Click "Confirm"
Step 4: Server: gradeSubmission(submission_id)
        ├─ For each submission_answer:
        │  ├─ Validate query
        │  ├─ Execute query
        │  ├─ Compare with expected_output
        │  ├─ Calculate is_correct and score
        │  └─ Update submission_answer
        └─ Sum scores → total_score
Step 5: Set status='submitted', submitted_at=now()
Step 6: Return results to student
Step 7: Show results page:
        ├─ Total score / max score
        ├─ Percentage
        ├─ Results by question:
        │  ├─ Question prompt
        │  ├─ Your query
        │  ├─ Expected output
        │  ├─ Your output
        │  ├─ Correct / Incorrect ✓/✗
        │  └─ Points earned
        └─ Options: View details, Download PDF
```

**Database Changes:**
```sql
INSERT INTO submission_answers (submission_id, question_id, query_text, actual_output, is_correct, score, evaluated_at)
VALUES ('submission_123', 'question_456', 'SELECT * FROM employees WHERE salary > 50000;', 
        '[{"id":1,"name":"Alice","salary":50000}]', true, 1, '2026-06-07 10:00:00');

UPDATE submissions SET status='submitted', total_score=5, submitted_at=now() 
WHERE id='submission_123';
```

#### View Results

```
Student can:
├─ See overall score and percentage
├─ View correct/incorrect for each question
├─ See their submitted query
├─ Compare with expected output
├─ Download results as PDF
└─ Retake test (new submission)

Teacher can:
├─ View all student submissions
├─ Filter by classroom/test
├─ See student name, email, score, timestamp
├─ Click to view detailed submission
├─ Export results as CSV/Excel
└─ Generate analytics report
```

---

### 5. Practice Module Workflow

#### Student Flow: Self-Paced Practice

```
Step 1: /student/practice
Step 2: Browse practice problems:
        ├─ Filter by difficulty: Basic / Intermediate / Advanced
        ├─ See problem library (built-in problems)
        ├─ Click on a problem
Step 3: Problem detail view:
        ├─ Problem prompt
        ├─ Dataset info
        ├─ SQL Editor with Run button
        ├─ Results table
        ├─ "Show Solution" button (hidden by default)
Step 4: Try to solve:
        ├─ Write query
        ├─ Click "Run Query"
        ├─ Get instant feedback
        └─ Can try multiple times
Step 5: Click "Show Solution"
Step 6: Server returns reference solution
Step 7: Student can:
        ├─ Compare with their solution
        ├─ Learn from reference
        └─ Continue practicing
```

**Note:** Practice problems are:
- NOT graded
- Available WITHOUT classroom enrollment
- Self-paced (no time limit)
- For learning purposes only

---

### 6. Dataset Management Workflow

#### Teacher Flow: Upload Dataset

```
Step 1: /teacher/datasets
Step 2: Click "Upload Dataset"
Step 3: Fill form:
        ├─ Dataset Name * (e.g., "Company Database")
        ├─ Description
        ├─ Schema SQL * (CREATE TABLE statements)
        │  Example:
        │  CREATE TABLE employees (
        │    id INT PRIMARY KEY AUTO_INCREMENT,
        │    name VARCHAR(100),
        │    salary DECIMAL(10,2)
        │  );
        ├─ Seed SQL (INSERT statements)
        │  Example:
        │  INSERT INTO employees (name, salary) VALUES
        │  ('Alice', 50000),
        │  ('Bob', 60000);
        └─ Submit
Step 4: Server processes:
        ├─ Parse schema SQL
        ├─ Create tables in TiDB
        ├─ Execute seed SQL to populate
        ├─ Convert to CSV format
        ├─ Upload CSV to Supabase Storage
        ├─ Create dataset_tables records
        └─ Set status='READY'
Step 5: Dataset available to use in tests
```

#### Teacher Flow: Manage Datasets

```
Features:
├─ View all uploaded datasets
├─ See dataset info:
│  ├─ Name, description
│  ├─ Table count, row count
│  ├─ Created date
│  ├─ Status (READY / PROCESSING / ERROR)
│  └─ Used in X questions
├─ Preview dataset (table view)
├─ Download dataset (CSV)
├─ Delete dataset (if unused)
└─ Edit metadata
```

---

### 7. Results & Export Workflow

#### Teacher Flow: View Results

```
Step 1: /teacher/classrooms/[classroom_id]/results
Step 2: See results dashboard:
        ├─ Filter by test
        ├─ Table with columns:
        │  ├─ Student Name
        │  ├─ Email
        │  ├─ Score / Max Score
        │  ├─ Percentage
        │  ├─ Submission Time
        │  └─ Status (Submitted / In Progress)
Step 3: Click on a row to view detailed submission:
        ├─ All questions and answers
        ├─ Student's queries
        ├─ Expected vs actual output
        ├─ Correctness per question
        └─ Notes for student (admin view)
```

#### Teacher Flow: Export Results

```
Step 1: /teacher/results
Step 2: Select test or classroom
Step 3: Click "Export"
Step 4: Choose format:
        ├─ CSV (lightweight, spreadsheet-friendly)
        └─ Excel (formatted, styled)
Step 5: Server generates file with:
        ├─ Student Name
        ├─ Email
        ├─ Test Title
        ├─ Total Score / Max Score
        ├─ Percentage
        ├─ Submission Time
        ├─ Status
        └─ (Optional) Per-question breakdown
Step 6: Download starts
Step 7: Teacher can import into LMS, analytics tool, etc.
```

**CSV Export Example:**
```csv
Student Name,Email,Test,Score,Max Score,Percentage,Submitted At
Alice Ahmed,alice@uet.edu.pk,Midterm,45,50,90%,2026-06-07 10:15:00
Bob Khan,bob@uet.edu.pk,Midterm,38,50,76%,2026-06-07 10:45:00
Carol Singh,carol@uet.edu.pk,Midterm,50,50,100%,2026-06-07 09:30:00
```

---

## API Documentation

### Authentication Endpoints

#### `POST /api/auth/signin`
Signs in user with Google OAuth.

**Client-Side (Next.js):**
```javascript
import { signIn } from "next-auth/react";
await signIn("google", { callbackUrl: "/" });
```

#### `GET /api/auth/session`
Returns current session if authenticated.

**Response:**
```json
{
  "user": {
    "email": "alice@gmail.com",
    "name": "Alice Ahmed",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "role": "teacher"
  }
}
```

---

### Classroom API

#### `GET /api/classrooms`
List classrooms for current user.

**Teachers:** Get classrooms they created  
**Students:** Get classrooms they're enrolled in (all statuses)

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Introduction to Databases",
    "description": "Learn SQL and database design",
    "invite_code": "A1B2C3D4",
    "teacher_id": "550e8400-e29b-41d4-a716-446655440001",
    "created_at": "2026-06-01T10:00:00Z",
    "enrollments": [{"count": 25}],
    "enrollment_status": "approved" // (Students only)
  }
]
```

#### `POST /api/classrooms`
Create a new classroom (teacher only).

**Request:**
```json
{
  "name": "Introduction to Databases",
  "description": "Learn SQL and database design",
  "email_domain": "student.uet.edu.pk"
}
```

**Response:** (201 Created)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Introduction to Databases",
  "invite_code": "A1B2C3D4",
  "teacher_id": "550e8400-e29b-41d4-a716-446655440001",
  "created_at": "2026-06-01T10:00:00Z"
}
```

#### `PUT /api/classrooms/[id]`
Update classroom details (teacher only).

**Request:**
```json
{
  "name": "Advanced Databases",
  "description": "Updated description"
}
```

#### `DELETE /api/classrooms/[id]`
Delete classroom and all related data (teacher only).

**Response:** (204 No Content)

#### `POST /api/classrooms/join`
Student joins a classroom with invite code.

**Request:**
```json
{
  "invite_code": "A1B2C3D4"
}
```

**Response:** (201 Created)
```json
{
  "classroom_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending"
}
```

#### `GET /api/classrooms/[id]/students`
Get list of students in classroom (teacher only).

**Response:**
```json
{
  "approved": [
    {
      "id": "student_123",
      "name": "Alice Ahmed",
      "email": "alice@uet.edu.pk",
      "joined_at": "2026-06-01T10:00:00Z"
    }
  ],
  "pending": [
    {
      "id": "student_456",
      "name": "Bob Khan",
      "email": "bob@uet.edu.pk",
      "requested_at": "2026-06-05T15:30:00Z"
    }
  ]
}
```

#### `PUT /api/classrooms/[id]/students/[sid]`
Approve/reject student (teacher only).

**Request:**
```json
{
  "action": "approve" // or "reject" or "remove"
}
```

---

### Test API

#### `GET /api/tests`
List tests for classrooms.

**Query Params:**
- `classroom_id`: Filter by classroom (optional)

**Response:**
```json
[
  {
    "id": "test_123",
    "classroom_id": "classroom_456",
    "title": "Midterm Assessment",
    "description": "SQL fundamentals",
    "time_limit_mins": 60,
    "due_at": "2026-06-15T14:00:00Z",
    "is_published": true,
    "question_count": 5,
    "created_at": "2026-06-01T10:00:00Z"
  }
]
```

#### `POST /api/tests`
Create a new test (teacher only).

**Request:**
```json
{
  "classroom_id": "classroom_456",
  "title": "Midterm Assessment",
  "description": "SQL fundamentals",
  "time_limit_mins": 60,
  "due_at": "2026-06-15T14:00:00Z"
}
```

#### `GET /api/tests/[id]`
Get test details with questions.

**Response:**
```json
{
  "id": "test_123",
  "title": "Midterm Assessment",
  "questions": [
    {
      "id": "q_1",
      "prompt": "Find all employees earning > 50000",
      "difficulty": "basic",
      "dataset_id": "dataset_123",
      "order_sensitive": false,
      "points": 1
    }
  ]
}
```

#### `PUT /api/tests/[id]`
Update test (teacher only).

#### `DELETE /api/tests/[id]`
Delete test (teacher only).

#### `PUT /api/tests/[id]/publish`
Publish test (make visible to students).

**Request:**
```json
{
  "is_published": true
}
```

#### `POST /api/tests/[id]/questions`
Add question to test (teacher only).

**Request:**
```json
{
  "prompt": "Find all employees earning > 50000",
  "difficulty": "basic",
  "dataset_id": "dataset_123",
  "expected_output": [
    {"id": 1, "name": "Alice", "salary": 50000},
    {"id": 2, "name": "Bob", "salary": 60000}
  ],
  "order_sensitive": false,
  "points": 1
}
```

#### `POST /api/tests/[id]/attempt`
Student starts a test attempt.

**Request:** (POST with no body)

**Response:** (201 Created)
```json
{
  "id": "submission_123",
  "test_id": "test_456",
  "student_id": "student_789",
  "status": "started",
  "started_at": "2026-06-07T10:00:00Z",
  "max_score": 5
}
```

---

### Submission API

#### `POST /api/submissions/[id]/submit`
Submit test answers for grading.

**Request:**
```json
{
  "answers": [
    {
      "question_id": "q_1",
      "query_text": "SELECT * FROM employees WHERE salary > 50000;"
    }
  ]
}
```

**Response:**
```json
{
  "submission_id": "submission_123",
  "status": "submitted",
  "total_score": 4,
  "max_score": 5,
  "percentage": 80,
  "submitted_at": "2026-06-07T10:45:00Z"
}
```

#### `GET /api/submissions/[id]`
Get submission details (student who submitted or teacher).

**Response:**
```json
{
  "id": "submission_123",
  "test_id": "test_456",
  "student": {
    "name": "Alice Ahmed",
    "email": "alice@uet.edu.pk"
  },
  "status": "submitted",
  "total_score": 4,
  "max_score": 5,
  "answers": [
    {
      "question_id": "q_1",
      "prompt": "Find all employees earning > 50000",
      "query_text": "SELECT * FROM employees WHERE salary > 50000;",
      "expected_output": [...],
      "actual_output": [...],
      "is_correct": true,
      "score": 1,
      "evaluated_at": "2026-06-07T10:45:00Z"
    }
  ]
}
```

---

### Query Execution API

#### `POST /api/engine/run`
Execute a SQL query (returns results without grading).

**Request:**
```json
{
  "query": "SELECT * FROM employees WHERE salary > 50000;",
  "datasetId": "dataset_123"
}
```

**Response:**
```json
{
  "rows": [
    {"id": 1, "name": "Alice", "salary": 50000},
    {"id": 2, "name": "Bob", "salary": 60000}
  ],
  "columns": ["id", "name", "salary"],
  "executionTimeMs": 45,
  "fromCache": false
}
```

**Error Response:**
```json
{
  "error": "Syntax error in query",
  "code": "QUERY_ERROR"
}
```

---

### Dataset API

#### `GET /api/datasets`
List datasets.

**Query Params:**
- `include_platform`: Include built-in datasets (default: true)

**Response:**
```json
[
  {
    "id": "dataset_123",
    "name": "Company Database",
    "description": "Employee and department data",
    "owner_id": "teacher_456",
    "status": "READY",
    "table_count": 3,
    "row_count": 150,
    "created_at": "2026-06-01T10:00:00Z"
  }
]
```

#### `POST /api/datasets`
Upload a new dataset (teacher only).

**Request:**
```json
{
  "name": "Company Database",
  "description": "Employee and department data",
  "schema_sql": "CREATE TABLE employees (...);",
  "seed_sql": "INSERT INTO employees (...) VALUES (...);"
}
```

**Response:** (201 Created)
```json
{
  "id": "dataset_123",
  "status": "PROCESSING",
  "message": "Dataset is being processed..."
}
```

#### `GET /api/datasets/[id]`
Get dataset details with table information.

**Response:**
```json
{
  "id": "dataset_123",
  "name": "Company Database",
  "tables": [
    {
      "original_table_name": "employees",
      "physical_table_name": "dataset_123_employees",
      "columns": [
        {"name": "id", "type": "INT"},
        {"name": "name", "type": "VARCHAR(100)"},
        {"name": "salary", "type": "DECIMAL(10,2)"}
      ],
      "row_count": 100,
      "sample_rows": [...]
    }
  ]
}
```

---

### Export API

#### `GET /api/export/csv/[testId]`
Export test results as CSV.

**Query Params:**
- `classroom_id`: Filter by classroom (optional)

**Response:** (Content-Type: text/csv)
```
Student Name,Email,Score,Max Score,Percentage,Submitted At
Alice Ahmed,alice@uet.edu.pk,45,50,90%,2026-06-07 10:15:00
```

#### `GET /api/export/excel/[testId]`
Export test results as Excel file.

**Response:** (Content-Type: application/vnd.xlsx)
(Binary Excel file with formatting)

---

### Metrics API

#### `GET /api/metrics`
Prometheus-compatible metrics endpoint.

**Response:** (text/plain; version=0.0.4)
```
# HELP devlab_jobs_enqueued_total Total jobs enqueued
# TYPE devlab_jobs_enqueued_total counter
devlab_jobs_enqueued_total 1543

# HELP devlab_jobs_completed_total Total jobs completed
# TYPE devlab_jobs_completed_total counter
devlab_jobs_completed_total 1540
```

---

## Frontend Components

### Component Architecture

```
src/components/
├── Navbar.jsx              # Top navigation bar with user menu
├── Sidebar.jsx             # Navigation sidebar (teacher/student)
├── SQLEditor.jsx           # Monaco SQL editor component
├── DataTable.jsx           # Results display table
├── OutputTable.jsx         # Query output table
├── Modal.jsx               # Reusable modal dialog
├── Badge.jsx               # Status badges
├── TestTimer.jsx           # Test countdown timer
├── ThemeToggle.jsx         # Dark/light mode toggle
└── UIFeedback.jsx          # Toast notifications
```

### Key Components

#### 1. SQLEditor Component

```jsx
<SQLEditor 
  value={queryText}
  onChange={setQueryText}
  height={300}
  readOnly={false}
  theme="dark"
/>
```

**Features:**
- Monaco Editor (VS Code editor)
- SQL syntax highlighting
- Auto-completion
- Line numbers
- Dark/light themes
- Read-only mode

#### 2. DataTable Component

```jsx
<DataTable
  columns={["id", "name", "salary"]}
  rows={[
    { id: 1, name: "Alice", salary: 50000 },
    { id: 2, name: "Bob", salary: 60000 }
  ]}
  sortable={true}
/>
```

**Features:**
- Dynamic columns
- Sortable headers
- Scrollable
- Responsive design
- Row highlighting

#### 3. Modal Component

```jsx
<Modal
  isOpen={showModal}
  title="Confirm Submission"
  onClose={() => setShowModal(false)}
>
  <p>Are you sure you want to submit?</p>
  <button onClick={handleSubmit}>Submit</button>
</Modal>
```

#### 4. TestTimer Component

```jsx
<TestTimer
  startTime={startTime}
  durationMs={timeLimit * 60 * 1000}
  onTimeUp={handleTimeUp}
/>
```

**Features:**
- Real-time countdown
- Warning when < 5 minutes
- Auto-submit when time expires
- Pause on window unfocus (optional)

### Page Layouts

#### Student Dashboard (`/student/dashboard`)

```
┌─────────────────────────────────────────┐
│ Navbar: Student Name | Theme | Sign Out │
├─────────────────────────────────────────┤
│ Sidebar:                                 │
│ ├─ Dashboard                             │
│ ├─ My Classrooms                         │
│ ├─ Practice                              │
│ └─ Results                               │
│                                          │
│ Main Content:                            │
│ ├─ Your Classrooms (cards with status)  │
│ ├─ Recent Tests                         │
│ ├─ Quick Stats (Avg score, Tests taken)│
│ └─ "Join Classroom" button              │
└─────────────────────────────────────────┘
```

#### Test Attempt Layout (`/student/tests/[id]/attempt`)

```
┌────────────────────────────────────────────────────────────┐
│ Test: "Midterm"  |  Time: 45:30 remaining  |  Submit Test │
├────────────┬──────────────────────┬─────────────────────────┤
│ Questions: │                      │  Query Output:          │
│            │   SQL EDITOR         │                         │
│ Q1: Find   │                      │  ┌─────────────────┐   │
│ employees  │ SELECT * FROM ...    │  │ id │ name │ sal │   │
│            │                      │  ├─────────────────┤   │
│ Q2: Count  │  [Run] [Clear]       │  │ 1  │ Alice│ 50k │   │
│ rows       │                      │  │ 2  │ Bob  │ 60k │   │
│            │                      │  └─────────────────┘   │
│ [Prev] [Next]                    │                         │
│ [4/5 answered]                   │  [Copy] [Download]      │
└────────────┴──────────────────────┴─────────────────────────┘
```

#### Teacher Classroom View (`/teacher/classrooms/[id]`)

```
┌──────────────────────────────────────────────┐
│ Classroom: "Intro to Databases"             │
├──────────────────────────────────────────────┤
│ Tabs: [Overview] [Tests] [Students] [Results]
│                                              │
│ Tests:                                       │
│ ├─ [New Test]                                │
│ │                                            │
│ ├─ Midterm Assessment    [Edit] [Publish]   │
│ │  5 questions | 60 min limit               │
│ │  Published | 25 students | 20 submitted   │
│ │                                            │
│ ├─ Quiz 1                [Edit] [Preview]   │
│ │  3 questions | No limit                   │
│ │  Draft (not published)                    │
│ │                                            │
│ └─ Assignment 2          [Edit] [Delete]    │
│    4 questions | 120 min limit              │
│    Published                                │
└──────────────────────────────────────────────┘
```

---

## Query Execution Engine

### Architecture

The query execution engine is the core of DevLab. It safely executes student SQL queries against isolated datasets and returns results.

### Execution Flow

```
1. Student submits query
   ↓
2. Validation Phase
   ├─ Check syntax
   ├─ Block dangerous keywords
   └─ Limit result size
   ↓ (If invalid → Return error)
   ↓
3. Dataset Loading Phase
   ├─ Load dataset from TiDB
   ├─ Get table mappings
   └─ Rewrite table names
   ↓
4. Cache Check
   ├─ Hash normalized query
   ├─ Check Redis/memory cache
   └─ Return if hit (TTL: 180s)
   ↓ (If cache miss)
   ↓
5. Execution Phase
   ├─ Get connection from TiDB pool
   ├─ Execute with 5s timeout
   ├─ Release connection
   └─ Serialize results
   ↓
6. Safety Check
   ├─ Rows < 100?
   ├─ Bytes < 524KB?
   └─ Sanitize output
   ↓
7. Cache Storage
   ├─ Store result with 180s TTL
   └─ Return to client
```

### Query Validation

**File:** `lib/engine/query-validator.js`

**Blocked Keywords (11 keywords):**
- `DROP` - Prevent table deletion
- `DELETE` - Prevent data deletion
- `TRUNCATE` - Prevent table clearing
- `ALTER` - Prevent schema modification
- `CREATE` - Prevent table creation
- `ATTACH` - Prevent database attachment
- `PRAGMA` - Prevent configuration changes
- `UPDATE` - Prevent data modification
- `INSERT` - Prevent data insertion
- `REPLACE` - Prevent data replacement
- `EXECUTE` - Prevent dynamic query execution

**Validation Function:**
```javascript
const validation = validateQuery(query);
if (!validation.valid) {
  // Return error: validation.error
}
```

**Rationale:** Students should only be able to READ data (SELECT), not modify or delete it.

### Table Name Rewriting

**Problem:** When teacher uploads a dataset, tables are created with physical names like `dataset_550e8400_employees`. But students write queries using original names like `employees`.

**Solution:** Table name rewriting maps original names to physical names.

**Example:**
```
Student writes:
  SELECT * FROM employees WHERE salary > 50000;

System rewrites to:
  SELECT * FROM dataset_550e8400_employees WHERE salary > 50000;

Then executes on TiDB.
```

**Implementation:**
```javascript
const tableMap = new Map([
  ["employees", "dataset_550e8400_employees"],
  ["departments", "dataset_550e8400_departments"]
]);

const rewritten = rewriteTableNames(query, tableMap);
// "SELECT * FROM dataset_550e8400_employees WHERE salary > 50000;"
```

### Result Caching

**Purpose:** Reduce database load and improve response time for identical queries.

**Cache Strategy:**
- **Key:** SHA1 hash of normalized query
- **Normalization:** Lowercase, trim, collapse whitespace
- **TTL:** 180 seconds (configurable)
- **Storage:** Redis (production) or in-memory (development)

**Example:**
```
Input Query:  "SELECT  *  FROM  employees  WHERE  salary > 50000"
Normalized:   "select * from employees where salary > 50000"
Hash:         "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
```

**Hit Scenarios:**
- Multiple students submit same query
- Student runs query multiple times
- Similar queries (same result)

**Cache Invalidation:**
- Automatic after 180s
- Manual on dataset update
- Never on query results (read-only operations)

### Connection Pooling

**Purpose:** Reuse database connections instead of creating new ones for each query.

**TiDB Pool:**
```
Pool Size: 10 connections
Wait Queue: Unlimited
Acquire Timeout: 10s
Idle Timeout: 30s
```

**Benefits:**
- Reduce latency (connection reuse)
- Prevent "connection pool exhausted" errors
- Support concurrent requests
- Graceful degradation when pooled out

### Timeout Handling

**Default Timeout:** 5000 ms (configurable)

**Timeout Behavior:**
```
Query starts executing
   ↓
5 seconds pass
   ↓
Promise.race(queryPromise, timeoutPromise)
   ↓ (timeout wins)
Connection released
   ↓
Return: { error: "Query execution timed out" }
```

**Why 5s?** Balance between:
- Allowing complex queries
- Preventing runaway queries
- Responding quickly to students

### Result Budget

**Max Rows:** 100 rows  
**Max Bytes:** 524 KB

**Enforcement:**
```javascript
if (rows.length > 100) {
  return { error: "Result exceeds max rows (100)" };
}
const bytes = Buffer.byteLength(JSON.stringify(result), 'utf8');
if (bytes > 524288) {
  return { error: "Result exceeds max payload (524KB)" };
}
```

**Why Limits?** Prevent:
- Browser performance issues
- Network congestion
- Excessive memory use
- Accidental full table exports

---

## Grading & Evaluation System

### Grading Algorithms

The system supports multiple grading strategies for flexibility.

#### 1. Binary Grading (Default)

**File:** `lib/engine/evaluate.js`

```javascript
function evaluateAnswer(studentRows, expectedRows, orderSensitive) {
  // Sort rows if order-insensitive
  if (!orderSensitive) {
    studentRows = sortRows(studentRows);
    expectedRows = sortRows(expectedRows);
  }
  
  // Deep comparison
  return JSON.stringify(studentRows) === JSON.stringify(expectedRows)
    ? { isCorrect: true }
    : { isCorrect: false };
}
```

**Scoring:**
- Correct answer: 100% of question points
- Incorrect answer: 0% of question points

**Example:** Question worth 1 point
- Correct query: 1 point ✓
- Wrong query: 0 points ✗

#### 2. Partial Credit Grading

**File:** `lib/engine/evaluate.js`

```javascript
function evaluateAnswerPartial(studentRows, expectedRows, orderSensitive) {
  const correct = studentRows.filter(r => expectedRows.includes(r)).length;
  const percent = (correct / expectedRows.length) * 100;
  
  return {
    isCorrect: percent === 100,
    percent: percent,
    rowsCorrect: correct,
    rowsExpected: expectedRows.length
  };
}
```

**Scoring:**
- Score = (correct rows / total expected rows) × question points
- Partial credit for partial results

**Example:** Question worth 10 points, 5 expected rows
- Student gets 3 rows correct: 6 points (60%)
- Student gets 2 rows correct: 4 points (40%)
- Student gets 0 rows correct: 0 points

**When to Use:**
- Complex multi-row queries
- Questions where partial solutions have value
- When you want to reward effort

#### 3. Detailed Grading Analysis

**File:** `lib/engine/evaluate.js`

```javascript
function detailedGradeQuery(studentResult, expectedResult) {
  // Column-by-column analysis
  // Identifies which columns are correct
  // Shows differences for teacher review
}
```

**Output:**
```json
{
  "isCorrect": false,
  "rowsMatch": 3,
  "rowsMissing": 2,
  "columnsCorrect": ["id", "name"],
  "columnsIncorrect": ["salary"],
  "differences": [...]
}
```

### Submission Grading Pipeline

**File:** `lib/engine/gradeSubmission.js`

```
gradeSubmission(submissionId)
  ↓
1. Load submission from database
  ↓
2. Load all submission_answers for this submission
  ↓
3. For each answer:
  ├─ Load corresponding question
  ├─ Check if query is provided
  ├─ Validate query (no DROP, DELETE, etc.)
  ├─ Execute query against dataset
  ├─ Compare actual_output with expected_output
  ├─ Determine is_correct and score
  └─ Update submission_answers table
  ↓
4. Sum all scores → total_score
  ↓
5. Update submissions table with:
  ├─ status: 'submitted'
  ├─ total_score: sum
  ├─ submitted_at: now()
  └─ updated_at: now()
  ↓
6. Return results to client
```

### Error Handling in Grading

```javascript
if (answer.query_text === null || answer.query_text.trim() === '') {
  // Empty answer → Score 0
  score = 0;
  is_correct = false;
}

const validation = validateQuery(query);
if (!validation.valid) {
  // Dangerous query blocked → Score 0
  score = 0;
  is_correct = false;
}

const result = await executeQuery(query, datasetId);
if (result.error) {
  // Syntax error or execution error → Score 0
  score = 0;
  is_correct = false;
  actual_output = [];
}

// Otherwise, compare and grade
```

### Row Comparison (Order-Sensitive vs Insensitive)

**Order-Sensitive (Default: false)**

```javascript
// If order_sensitive = false
const sort = (rows) => JSON.stringify(rows.sort((a, b) => 
  JSON.stringify(a).localeCompare(JSON.stringify(b))
));

const studentSorted = sort(studentRows);
const expectedSorted = sort(expectedRows);
const isCorrect = studentSorted === expectedSorted;
```

**Why?** Usually, SQL query order doesn't matter to students (unless `ORDER BY` is the point of the question).

**When Order Matters:**
- Question specifically asks for sorting
- Top-N queries (first 5 employees)
- Ranked results

---

## Authentication & Authorization

### NextAuth.js Configuration

**File:** `lib/authOptions.js`

```javascript
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Save user to Supabase on first login
      const { error } = await supabaseAdmin.from('users').upsert(
        { email: user.email, name: user.name, avatar_url: user.image },
        { onConflict: 'email' }
      );
      return true;
    },
    
    async jwt({ token, user }) {
      // Fetch role from Supabase and add to JWT
      if (user?.email) {
        const { data } = await supabaseAdmin
          .from('users')
          .select('id, role')
          .eq('email', user.email)
          .single();
        token.userId = data.id;
        token.role = data.role;
      }
      return token;
    },
    
    async session({ session, token }) {
      // Add custom data to session
      session.user.id = token.userId;
      session.user.role = token.role;
      return session;
    },
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
};
```

### Session Management

**Session Object:**
```javascript
{
  user: {
    email: "alice@gmail.com",
    name: "Alice Ahmed",
    image: "https://lh3.googleusercontent.com/...",
    id: "550e8400-e29b-41d4-a716-446655440000",
    role: "teacher" // Added by JWT callback
  },
  expires: "2026-06-07T10:00:00Z"
}
```

**Getting Session (Server):**
```javascript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

const session = await getServerSession(authOptions);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
console.log(session.user.role); // 'teacher' or 'student'
```

**Getting Session (Client):**
```jsx
import { useSession } from 'next-auth/react';

function MyComponent() {
  const { data: session } = useSession();
  
  return (
    <>
      {session?.user?.name}
      Role: {session?.user?.role}
    </>
  );
}
```

### Role-Based Access Control (RBAC)

**Enforcement Points:**

1. **API Route Protection:**
```javascript
export async function POST(req) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('email', session.user.email)
    .single();
  
  if (user.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Teacher-only code
}
```

2. **Frontend Route Protection:**
```jsx
function TeacherDashboard() {
  const { data: session } = useSession();
  
  if (session?.user?.role !== 'teacher') {
    return <Redirect to="/student/dashboard" />;
  }
  
  return <TeacherInterface />;
}
```

### Permission Matrix

| Feature | Student | Teacher | Anonymous |
|---------|---------|---------|-----------|
| Create classroom | ✗ | ✓ | ✗ |
| Join classroom | ✓ | ✗ | ✗ |
| Take test | ✓ | ✗ | ✗ |
| Create test | ✗ | ✓ | ✗ |
| View student submissions | ✗ | ✓ | ✗ |
| Upload dataset | ✗ | ✓ | ✗ |
| Practice SQL | ✓ | ✓ | ✗ |
| Export results | ✗ | ✓ | ✗ |
| View results | ✓ (own) | ✓ (all) | ✗ |

---

## Deployment & Infrastructure

### Local Development Setup

**Prerequisites:**
```bash
Node.js 18+
npm or yarn
PostgreSQL (Supabase local emulator optional)
TiDB account (or local MySQL)
Google OAuth credentials
```

**Installation:**
```bash
# Clone repository
git clone https://github.com/your-org/devlab.git
cd devlab

# Install dependencies
npm ci

# Create environment file
cp .env.example .env.local

# Fill in credentials
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# TIDB_HOST, TIDB_USER, TIDB_PASSWORD
# GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
# NEXTAUTH_URL, NEXTAUTH_SECRET

# Run migrations (optional)
npm run migrate

# Start development server
npm run dev

# Open http://localhost:3000
```

### Production Deployment

**Deployment Targets:**

#### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

#### Option 2: Self-Hosted (Docker)
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

**Build & Run:**
```bash
docker build -t devlab:latest .
docker run -p 3000:3000 \
  -e SUPABASE_URL=... \
  -e TIDB_HOST=... \
  devlab:latest
```

### Infrastructure Diagram

```
Production Stack:
┌────────────────────────────────────────────┐
│ CloudFlare / CDN (caching, DDoS protection)│
└─────────────────┬──────────────────────────┘
                  ↓
┌────────────────────────────────────────────┐
│ Vercel / Application Server                │
│ ├─ Next.js 16 (Server-Side Rendering)     │
│ ├─ API Routes (REST)                      │
│ ├─ Auth (NextAuth)                        │
│ └─ Caching (in-memory + Redis)            │
└────────┬─────────────────────┬─────────────┘
         ↓                     ↓
  ┌────────────────┐  ┌──────────────────────┐
  │ Supabase       │  │ TiDB Cloud Starter   │
  │ (PostgreSQL)   │  │ (Distributed SQL DB) │
  │ ├─ Users       │  │ ├─ Datasets          │
  │ ├─ Classrooms  │  │ ├─ Physical Tables   │
  │ ├─ Tests       │  │ └─ Query Execution   │
  │ ├─ Submissions │  │                      │
  │ └─ Questions   │  │ (Query Timeout: 5s)  │
  │                │  │ (Max Results: 100)   │
  │ (Storage)      │  │                      │
  │ ├─ Datasets    │  │                      │
  │ └─ Uploads     │  │                      │
  └────────────────┘  └──────────────────────┘
         ↑
         └─ Redis (optional, for worker queue)
```

### Environment Variables

**Required:**
```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...

# TiDB
TIDB_HOST=gateway01.us-west-2.prod.aws.tidbcloud.com
TIDB_PORT=4000
TIDB_USER=xxxxx
TIDB_PASSWORD=xxxxx
TIDB_DATABASE=devlabs_datasets
TIDB_SSL=true

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# NextAuth
NEXTAUTH_URL=http://localhost:3000 (dev) or https://your-domain.com (prod)
NEXTAUTH_SECRET=generate-with: openssl rand -base64 32

# Node
NODE_ENV=development|production
```

**Optional:**
```bash
# Query Execution
EXEC_MAX_RESULT_ROWS=100 (default)
EXEC_MAX_RESULT_BYTES=524288 (default, 512KB)
SUBMIT_QUERY_TIMEOUT_MS=5000 (default)
EXEC_RESULT_CACHE_TTL_SEC=180 (default)

# Worker Queue
ENABLE_EXECUTION_WORKER=0|1
WORKER_BACKEND=inproc|redis
WORKER_CONCURRENCY=2 (default)
REDIS_URL=redis://localhost:6379
```

### Database Migrations

**Supabase Migrations:**
```bash
# Migrations are in lib/db/migrations/

# Apply manually via Supabase dashboard:
# 1. Go to SQL Editor
# 2. Create new query
# 3. Copy-paste migration SQL
# 4. Execute

# Or via CLI:
npm run migrate
```

**Migration Files:**
```
lib/db/migrations/
├── 001_init.sql (initial schema)
├── 002_add_partial_grading.sql
└── 003_add_plagiarism_detection.sql
```

---

## Testing Strategy

### Unit Tests

**File:** `scripts/run-evaluate-tests.js`

```bash
npm run test:unit
```

Tests:
- Grading algorithms (binary, partial, detailed)
- Query validation
- Table name rewriting
- Row comparison (order-sensitive/insensitive)

**Example Test:**
```javascript
function testBinaryGrading() {
  const expected = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" }
  ];
  
  const student = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" }
  ];
  
  const result = evaluateAnswer(student, expected, false);
  assert(result.isCorrect === true);
}
```

### Query Validator Tests

**File:** `scripts/run-validate-tests.js`

```bash
npm run test:validator
```

Tests:
- Blocked keywords detection
- SQL injection prevention
- Valid SELECT queries pass
- Invalid queries caught

### Integration Tests

**File:** `scripts/run-queue-tests.js`

```bash
npm run test:integration
```

Tests:
- Full workflow (job enqueue → execution → results)
- Redis worker integration
- Timeout handling
- Error recovery

### End-to-End Tests

Manual testing checklist:
```
Authentication:
 □ Google OAuth login
 □ Student redirect to /student/dashboard
 □ Teacher redirect to /teacher/dashboard
 □ Session persistence
 □ Sign out functionality

Classroom:
 □ Create classroom
 □ Generate invite code
 □ Student joins with code
 □ Teacher approves student
 □ Student sees approved status
 □ Teacher can remove student

Tests:
 □ Create test with questions
 □ Publish test
 □ Student sees published test
 □ Student starts test attempt
 □ Timer counts down
 □ Can answer multiple questions
 □ Submit test for grading
 □ View results

Grading:
 □ Correct answer → 100%
 □ Wrong answer → 0%
 □ Partial credit (if enabled)
 □ Total score calculated correctly
 □ Results saved to database

Exports:
 □ Export as CSV
 □ Export as Excel
 □ Downloaded file contains correct data
```

### Performance Tests

**Load Testing Script:** `scripts/load-test.js`

```bash
TARGET_URL=http://localhost:3000/api/engine/run \
CONCURRENCY=20 \
REQS=200 \
npm run load:test
```

**Metrics:**
- Requests per second
- Average response time
- 95th percentile latency
- Error rate

**Target:** 
- < 200ms average response time
- < 5% error rate
- Support 100 concurrent requests

---

## Security Considerations

### 1. Query Validation & SQL Injection Prevention

**Blocked Keywords:**
```
DROP, DELETE, TRUNCATE, ALTER, CREATE, 
ATTACH, PRAGMA, UPDATE, INSERT, REPLACE, EXECUTE
```

**Validation Function:**
```javascript
export function validateQuery(query) {
  const normalized = query.toUpperCase();
  const blockedKeywords = [
    /\bDROP\b/, /\bDELETE\b/, /\bTRUNCATE\b/, 
    /\bALTER\b/, /\bCREATE\b/, /\bATTACH\b/,
    /\bPRAGMA\b/, /\bUPDATE\b/, /\bINSERT\b/,
    /\bREPLACE\b/, /\bEXECUTE\b/
  ];
  
  for (const keyword of blockedKeywords) {
    if (keyword.test(normalized)) {
      return { valid: false, error: `Query contains '${keyword}' which is not allowed` };
    }
  }
  
  return { valid: true, query };
}
```

### 2. Access Control

**API Route Protection:**
- Every API route checks session
- Every teacher-only route verifies role
- Student can only access their own submissions

**Example:**
```javascript
// /api/tests (POST) - teacher only
const user = await getUser(session.email);
if (user.role !== 'teacher') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// /api/submissions/[id]/submit - student or teacher
const user = await getUser(session.email);
const submission = await getSubmission(id);
if (user.id !== submission.student_id && user.role !== 'teacher') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### 3. Secrets Management

**Never Commit Secrets:**
```bash
# .gitignore
.env.local
.env.*.local
/node_modules
```

**Environment Variables:**
```bash
# Always use environment variables for secrets
SUPABASE_SERVICE_ROLE_KEY=xxxx
TIDB_PASSWORD=xxxx
GOOGLE_CLIENT_SECRET=xxxx
NEXTAUTH_SECRET=xxxx
```

**Rotation Procedures:**
```bash
# If secret is leaked:
1. Update in deployment platform (Vercel, etc.)
2. Notify users if user data exposed
3. Rotate OAuth tokens
4. Clean git history: git filter-repo --invert-paths --path secrets.txt
5. Force push (if not in production)
```

### 4. Rate Limiting

**Optional Middleware:**

```javascript
// lib/middleware/rateLimit.js
export function rateLimitMiddleware(req, options = {}) {
  const {
    maxRequests = 100,
    windowMs = 60000 // 1 minute
  } = options;
  
  const key = `${req.ip}:${req.path}`;
  const current = cache.get(key) || 0;
  
  if (current >= maxRequests) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
  
  cache.set(key, current + 1, windowMs);
}
```

### 5. Database Security

**Supabase:**
- Row-level security (RLS) policies
- Only service role can access from API
- User data filtered by ownership

**TiDB:**
- Dataset tables use unique prefixes (dataset_[ID]_[TABLE])
- Prevents cross-dataset queries
- Connection pooling with limits

### 6. Timeout Protection

**Query Timeout:**
```javascript
const queryPromise = conn.query(sql);
const timeout = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Query timed out')), 5000)
);
await Promise.race([queryPromise, timeout]);
```

**Why?** Prevent infinite loops, runaway queries, resource exhaustion.

### 7. Result Budget

**Limits:**
- Max 100 rows returned
- Max 524 KB payload
- Prevents:
  - Browser crashes
  - Network exhaustion
  - Accidental exports

---

## Performance Optimization

### 1. Query Caching

**Problem:** Identical queries from multiple students → Multiple TiDB executions

**Solution:** Cache query results by query hash

**Implementation:**
```javascript
const cacheKey = hash(normalizeQuery(query));
const cached = cacheGet(cacheKey);
if (cached) {
  return cached; // Hit! Return immediately
}

const result = await executeQuery(query, datasetId, timeout);
cacheSet(cacheKey, result, TTL_SECONDS);
return result;
```

**Cache Statistics:**
- Hit Rate Target: 70%+
- TTL: 180 seconds
- Typical hit scenarios:
  - 30 students, same question → 29 cache hits
  - Student retakes test → 100% cache hit

### 2. Connection Pooling

**Problem:** Creating new DB connections is slow (~100ms per connection)

**Solution:** Reuse connections from a pool

**Pool Configuration:**
```javascript
const pool = mysql.createPool({
  host: TIDB_HOST,
  user: TIDB_USER,
  password: TIDB_PASSWORD,
  database: TIDB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0
});
```

**Performance Impact:**
- First query: ~150ms (includes connection)
- Pooled query: ~50ms (no connection overhead)
- 67% latency reduction!

### 3. Worker Queue

**Problem:** Query execution blocks HTTP request, causing slow user response

**Solution:** Offload to async worker, return job ID, poll for results

**Before:**
```
Request → Execute Query (5s) → Response (total: 5s)
User waits 5 seconds
```

**After (with worker):**
```
Request → Enqueue Job (50ms) → Response (total: 50ms)
User sees results immediately
Background: Worker executes (5s), stores results
User polls: Gets results when ready
```

**Implementation:**
```bash
# With Redis worker
ENABLE_EXECUTION_WORKER=1
WORKER_BACKEND=redis
REDIS_URL=redis://localhost:6379

# Start worker
node scripts/worker-redis.js
```

### 4. Database Indexes

**Supabase Indexes:**
```sql
CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_classroom_id ON enrollments(classroom_id);
CREATE INDEX idx_questions_test_id ON questions(test_id);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);
CREATE INDEX idx_submissions_test_id ON submissions(test_id);
CREATE INDEX idx_submission_answers_submission_id ON submission_answers(submission_id);
```

**Index Hit Rate:** 99%+ of queries use indexes

### 5. Pagination

**Problem:** Loading thousands of submissions at once → Memory, network overload

**Solution:** Pagination (fetch in batches)

```javascript
// API
GET /api/results?page=1&limit=50

// Returns
{
  data: [/* 50 submissions */],
  total: 1250,
  page: 1,
  pageSize: 50,
  totalPages: 25
}
```

### 6. Lazy Loading (Frontend)

**Problem:** Load all test questions at once → Slow page load

**Solution:** Lazy load questions as user navigates

```jsx
// Load first question immediately
// Load next question in background when user clicks "Next"
useEffect(() => {
  if (currentQuestion < totalQuestions - 1) {
    prefetchQuestion(currentQuestion + 1);
  }
}, [currentQuestion]);
```

### 7. Compression

**Problem:** Large responses (CSV exports, result tables)

**Solution:** GZIP compression (automatic in most servers)

```javascript
// Next.js automatically compresses with gzip
// Typical: 500KB → 50KB (10x reduction)
```

### 8. Caching Headers (Browser)

```javascript
// For static assets
res.setHeader('Cache-Control', 'public, max-age=3600');

// For API responses
res.setHeader('Cache-Control', 'private, max-age=60');
```

---

## Future Enhancements

### Phase 2: Advanced Features (In Development)

#### 1. Partial Grading UI
- Teachers set points per question
- Students see partial credit
- Export includes per-question breakdown
- **Estimate:** 3-7 days

#### 2. Plagiarism Detection
- Fingerprint-based similarity detection
- Flag suspicious submissions
- Teacher review interface
- **Estimate:** 10-15 days

#### 3. Per-Question Export Details
- Export student queries in detail
- Include actual vs expected output
- Support for learning analysis
- **Estimate:** 2-3 days

#### 4. MySQL Sandbox Adapter
- Optional MySQL instead of SQLite
- Adapter pattern for extensibility
- Feature flag for gradual rollout
- **Estimate:** 5-8 days

### Phase 3: Analytics & Insights (Planned)

#### 1. Performance Dashboard
- Class averages
- Completion rates
- Difficulty heatmaps
- Student performance trends

#### 2. Question Analytics
- Question difficulty (by pass rate)
- Time to answer
- Common mistakes
- **Supports:** Curriculum improvement

#### 3. Visualizations
- Charts: Class distribution
- Scatter plots: Score vs time
- Heatmaps: Question difficulty
- Timeline: Progress over semester

### Phase 4: Collaboration & AI (Future)

#### 1. Real-Time Collaboration
- Live pair programming
- Shared query editor
- Real-time chat
- **Use Case:** Group assignments

#### 2. AI-Assisted Learning
- Generate hints for stuck students
- Suggest query improvements
- LLM integration (GPT, Claude)
- **Cost:** ~$0.01 per hint

#### 3. Auto-Generated Practice Problems
- AI generates problems from datasets
- Variation of existing problems
- Difficulty scaling

### Phase 5: Expansion (Long-term)

#### 1. Multiple Programming Languages
- Python, JavaScript, Java
- Abstract execution engine
- Per-language sandboxes

#### 2. Code Quality Assessment
- Style scoring
- Complexity analysis
- Best practices enforcement

#### 3. Soft Skills Assessment
- Team collaboration metrics
- Code review simulation
- Documentation quality

---

## Project Statistics

### Codebase Size

```
Frontend Components:   ~2,500 lines
API Routes:            ~8,000 lines
Business Logic:        ~5,000 lines
Database Schema:       ~500 lines
Scripts & Tests:       ~3,000 lines
─────────────────────────────────
Total:                ~19,000 lines
```

### Database Schema

```
Tables:          9
Relations:       15+
Indexes:         20+
Stored Procedures: 0
Triggers:        0
```

### API Endpoints

```
Classrooms:      7 endpoints
Tests:           6 endpoints
Questions:       4 endpoints
Submissions:     3 endpoints
Datasets:        4 endpoints
Engine:          2 endpoints
Export:          2 endpoints
─────────────────────────────
Total:          28+ endpoints
```

### Test Coverage

```
Unit Tests:      45+ tests
Integration:     12+ tests
E2E:             Manual (documented)
Coverage:        ~65%
```

### Performance Benchmarks

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| Query execution | < 5s | ~0.2s | ✓ |
| API response | < 200ms | ~50ms | ✓ |
| Page load | < 2s | ~0.8s | ✓ |
| Cache hit | > 60% | ~75% | ✓ |
| Concurrent users | 100 | 150 | ✓ |

---

## Conclusion

DevLab is a comprehensive, production-ready SQL assessment platform designed for educational institutions. Its architecture balances:

- **Simplicity:** Easy to use for students and teachers
- **Safety:** Isolated query execution, input validation
- **Scalability:** Worker queues, connection pooling, caching
- **Extensibility:** Adapter patterns for future languages
- **Reliability:** Comprehensive error handling, testing

The platform has successfully implemented Phase 1 and is ready for Phase 2 development. Continued focus on plagiarism detection, analytics, and real-time features will enhance the platform's value for educators.

---

## References & Documentation

**External Documentation:**
- Next.js: https://nextjs.org/docs
- NextAuth.js: https://next-auth.js.org
- Supabase: https://supabase.com/docs
- TiDB: https://docs.tidbcloud.com
- Monaco Editor: https://github.com/suren-atoyan/monaco-react
- BullMQ: https://docs.bullmq.io

**Project Documentation:**
- Architecture: `/docs/COMPLETE_SYSTEM_GUIDE.md`
- Environment: `/docs/ENVIRONMENT.md`
- Implementation: `/docs/IMPLEMENTATION_PLAN.md`
- Audit: `/docs/AUDIT_REPORT.md`

**Internal References:**
- API Routes: `/app/api/**/*.js`
- Business Logic: `/lib/**/*.js`
- Components: `/components/*.jsx`
- Database Schema: `/lib/db/schema.sql`

---

**Document Version:** 1.0  
**Last Updated:** June 7, 2026  
**Author:** DevLab Project Team  
**Status:** ✅ Complete & Production Ready
