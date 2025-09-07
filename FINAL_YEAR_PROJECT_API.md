# Final Year Project Management API Documentation

## Overview

This API provides comprehensive management for final year (400-level) student projects, including project year creation, group management, and multi-stage grading system.

## Base URL

All project management endpoints are prefixed with: `/api/projects`

## Authentication

All endpoints require authentication via Bearer token:

```
Authorization: Bearer <jwt_token>
```

---

## Project Year Management

### 1. Create Project Year

Creates a new academic year folder for final year projects.

**Endpoint:** `POST /api/projects/years`
**Roles:** Lecturer, HoD

**Request Body:**

```json
{
  "academic_year": "2024/2025",
  "department_id": "507f1f77bcf86cd799439011"
}
```

**Response (201):**

```json
{
  "message": "Project year created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "academic_year": "2024/2025",
    "department_id": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Computer Science"
    },
    "created_by": {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Dr. John Doe",
      "email": "john.doe@university.edu"
    },
    "status": "Active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Get Project Years

Retrieves project years based on user role and department.

**Endpoint:** `GET /api/projects/years`
**Roles:** Lecturer, HoD, Admin

**Query Parameters:**

- `department_id` (optional): Filter by department

**Response (200):**

```json
{
  "message": "Project years retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "academic_year": "2024/2025",
      "department_id": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Computer Science"
      },
      "created_by": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Dr. John Doe",
        "email": "john.doe@university.edu"
      },
      "status": "Active",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

## Project Group Management

### 3. Create Project Group

Creates a new project group with 400-level students.

**Endpoint:** `POST /api/projects/groups`
**Roles:** Lecturer, HoD

**Request Body:**

```json
{
  "project_year_id": "507f1f77bcf86cd799439011",
  "topic": "Development of a Machine Learning-based Academic Management System",
  "members": [
    {
      "student_id": "507f1f77bcf86cd799439014"
    },
    {
      "student_id": "507f1f77bcf86cd799439015"
    }
  ],
  "supervisor_id": "507f1f77bcf86cd799439013"
}
```

**Response (201):**

```json
{
  "message": "Project group created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439016",
    "project_year_id": {
      "_id": "507f1f77bcf86cd799439011",
      "academic_year": "2024/2025"
    },
    "group_number": 1,
    "topic": "Development of a Machine Learning-based Academic Management System",
    "members": [
      {
        "student_id": {
          "_id": "507f1f77bcf86cd799439014",
          "name": "Alice Johnson",
          "index_number": "CS/2020/001"
        },
        "student_name": "Alice Johnson",
        "student_index": "CS/2020/001"
      },
      {
        "student_id": {
          "_id": "507f1f77bcf86cd799439015",
          "name": "Bob Smith",
          "index_number": "CS/2020/002"
        },
        "student_name": "Bob Smith",
        "student_index": "CS/2020/002"
      }
    ],
    "supervisor_id": {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Dr. John Doe",
      "email": "john.doe@university.edu"
    },
    "current_stage": "Proposal",
    "status": "Active",
    "createdAt": "2024-01-15T11:00:00.000Z"
  }
}
```

### 4. Get Project Groups

Retrieves project groups with filtering options.

**Endpoint:** `GET /api/projects/groups`
**Roles:** Lecturer, HoD, Admin

**Query Parameters:**

- `project_year_id` (optional): Filter by project year
- `supervisor_id` (optional): Filter by supervisor
- `current_stage` (optional): Filter by stage (Proposal, Progress, Defense)
- `status` (optional): Filter by status (Active, Completed, Suspended)

**Response (200):**

```json
{
  "message": "Project groups retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439016",
      "project_year_id": {
        "_id": "507f1f77bcf86cd799439011",
        "academic_year": "2024/2025"
      },
      "group_number": 1,
      "topic": "Development of a Machine Learning-based Academic Management System",
      "members": [
        {
          "student_id": {
            "_id": "507f1f77bcf86cd799439014",
            "name": "Alice Johnson",
            "index_number": "CS/2020/001",
            "level": "400"
          },
          "student_name": "Alice Johnson",
          "student_index": "CS/2020/001"
        }
      ],
      "supervisor_id": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Dr. John Doe",
        "email": "john.doe@university.edu"
      },
      "current_stage": "Progress",
      "status": "Active"
    }
  ]
}
```

### 5. Update Project Group

Updates project group information.

**Endpoint:** `PUT /api/projects/groups/:groupId`
**Roles:** Lecturer, HoD

**Request Body:**

```json
{
  "topic": "Enhanced Machine Learning-based Academic Management System with AI Integration",
  "current_stage": "Progress",
  "status": "Active"
}
```

**Response (200):**

```json
{
  "message": "Project group updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439016",
    "topic": "Enhanced Machine Learning-based Academic Management System with AI Integration",
    "current_stage": "Progress",
    "status": "Active"
    // ... other fields
  }
}
```

---

## Project Grading System

### 6. Grade Project

Assigns grades for different project stages.

**Endpoint:** `POST /api/projects/grades`
**Roles:** Lecturer, HoD

**Request Body:**

```json
{
  "project_group_id": "507f1f77bcf86cd799439016",
  "stage": "Proposal",
  "score": 85,
  "comments": "Excellent project proposal with clear objectives and methodology. Minor improvements needed in literature review.",
  "is_final": true
}
```

**Response (201):**

```json
{
  "message": "Project graded successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439017",
    "project_group_id": {
      "_id": "507f1f77bcf86cd799439016",
      "topic": "Development of a Machine Learning-based Academic Management System",
      "group_number": 1
    },
    "stage": "Proposal",
    "grader_id": {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Dr. John Doe",
      "email": "john.doe@university.edu"
    },
    "grader_name": "Dr. John Doe",
    "score": 85,
    "comments": "Excellent project proposal with clear objectives and methodology. Minor improvements needed in literature review.",
    "is_final": true,
    "grading_date": "2024-02-15T14:30:00.000Z",
    "createdAt": "2024-02-15T14:30:00.000Z"
  }
}
```

### 7. Get Project Grades

Retrieves project grades with filtering options.

**Endpoint:** `GET /api/projects/grades`
**Roles:** Lecturer, HoD, Admin

**Query Parameters:**

- `project_group_id` (optional): Filter by project group
- `stage` (optional): Filter by stage
- `grader_id` (optional): Filter by grader
- `is_final` (optional): Filter by final grades only

**Response (200):**

```json
{
  "message": "Project grades retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439017",
      "project_group_id": {
        "_id": "507f1f77bcf86cd799439016",
        "topic": "Development of a Machine Learning-based Academic Management System",
        "group_number": 1,
        "current_stage": "Progress"
      },
      "stage": "Proposal",
      "grader_id": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Dr. John Doe",
        "email": "john.doe@university.edu"
      },
      "score": 85,
      "comments": "Excellent project proposal...",
      "is_final": true,
      "grading_date": "2024-02-15T14:30:00.000Z"
    }
  ]
}
```

### 8. Get Final Project Grade

Calculates and returns the overall project grade.

**Endpoint:** `GET /api/projects/groups/:groupId/final-grade`
**Roles:** Lecturer, HoD, Admin, Student

**Response (200):**

```json
{
  "message": "Final project grade calculated successfully",
  "data": {
    "project_group": {
      "_id": "507f1f77bcf86cd799439016",
      "group_number": 1,
      "topic": "Development of a Machine Learning-based Academic Management System",
      "current_stage": "Defense",
      "status": "Completed"
    },
    "stage_grades": [
      {
        "_id": "507f1f77bcf86cd799439017",
        "stage": "Proposal",
        "score": 85,
        "comments": "Excellent project proposal...",
        "grading_date": "2024-02-15T14:30:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439018",
        "stage": "Progress",
        "score": 88,
        "comments": "Good progress shown...",
        "grading_date": "2024-04-15T14:30:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439019",
        "stage": "Defense",
        "score": 90,
        "comments": "Excellent defense presentation...",
        "grading_date": "2024-06-15T14:30:00.000Z"
      }
    ],
    "final_grade": 88.5
  }
}
```

---

## Student Project Routes

### 9. Get My Project Group

Allows students to view their own project group information.

**Endpoint:** `GET /api/student/projects/my-group`
**Roles:** Student

**Response (200):**

```json
{
  "message": "Project group retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439016",
    "project_year_id": {
      "_id": "507f1f77bcf86cd799439011",
      "academic_year": "2024/2025",
      "department_id": "507f1f77bcf86cd799439012"
    },
    "group_number": 1,
    "topic": "Development of a Machine Learning-based Academic Management System",
    "members": [
      {
        "student_id": {
          "_id": "507f1f77bcf86cd799439014",
          "name": "Alice Johnson",
          "index_number": "CS/2020/001",
          "level": "400"
        },
        "student_name": "Alice Johnson",
        "student_index": "CS/2020/001"
      }
    ],
    "supervisor_id": {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Dr. John Doe",
      "email": "john.doe@university.edu",
      "phone": "+233123456789"
    },
    "current_stage": "Progress",
    "status": "Active"
  }
}
```

### 10. Get My Project Grades

Allows students to view their project grades.

**Endpoint:** `GET /api/student/projects/my-grades`
**Roles:** Student

**Response (200):**

```json
{
  "message": "Project grades retrieved successfully",
  "data": {
    "project_group": {
      "_id": "507f1f77bcf86cd799439016",
      "topic": "Development of a Machine Learning-based Academic Management System",
      "current_stage": "Progress",
      "status": "Active"
    },
    "grades": [
      {
        "_id": "507f1f77bcf86cd799439017",
        "stage": "Proposal",
        "grader_id": {
          "_id": "507f1f77bcf86cd799439013",
          "name": "Dr. John Doe",
          "email": "john.doe@university.edu"
        },
        "score": 85,
        "comments": "Excellent project proposal...",
        "is_final": true,
        "grading_date": "2024-02-15T14:30:00.000Z"
      }
    ],
    "final_grade": 85
  }
}
```

### 11. Get Department Projects

Allows students to view all projects in their department (for reference).

**Endpoint:** `GET /api/student/projects/department-projects`
**Roles:** Student

**Query Parameters:**

- `academic_year` (optional): Filter by academic year

**Response (200):**

```json
{
  "message": "Department projects retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439016",
      "group_number": 1,
      "topic": "Development of a Machine Learning-based Academic Management System",
      "current_stage": "Progress",
      "status": "Active",
      "supervisor_id": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Dr. John Doe"
      },
      "project_year_id": {
        "_id": "507f1f77bcf86cd799439011",
        "academic_year": "2024/2025"
      }
    }
  ]
}
```

---

## Grading System Details

### Stage Weights

The final project grade is calculated using weighted averages:

- **Proposal**: 20% (0.2)
- **Progress**: 30% (0.3)
- **Defense**: 50% (0.5)

### Grade Progression

- Projects start at "Proposal" stage
- After final grading of each stage, the project automatically progresses to the next stage
- After "Defense" stage completion, the project status changes to "Completed"

---

## Error Responses

### Validation Error (400)

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "academic_year",
      "message": "Academic year must be in format YYYY/YYYY"
    }
  ]
}
```

### Unauthorized (401)

```json
{
  "error": "Access denied. No token provided."
}
```

### Forbidden (403)

```json
{
  "error": "Only lecturers and HoDs can create project years"
}
```

### Not Found (404)

```json
{
  "error": "Project group not found"
}
```

### Server Error (500)

```json
{
  "error": "Internal server error"
}
```

---

## Usage Examples

### Creating a Complete Project Workflow

1. **Create Project Year** (HoD/Lecturer)
2. **Create Project Groups** (Lecturer)
3. **Grade Proposal Stage** (Lecturer)
4. **Grade Progress Stage** (Lecturer)
5. **Grade Defense Stage** (Lecturer)
6. **View Final Grade** (All roles)

### Student Workflow

1. **Check Project Assignment**: `GET /api/student/projects/my-group`
2. **View Current Grades**: `GET /api/student/projects/my-grades`
3. **Browse Department Projects**: `GET /api/student/projects/department-projects`
