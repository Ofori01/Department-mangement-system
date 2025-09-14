# Student Promotion Management API Documentation

## Overview

This API provides functionality for administrators to promote students to the next academic level and handle graduations. When students reach level 400 (final year), they are marked as graduated rather than deleted from the system.

## Base URL

All student promotion endpoints are prefixed with: `/api/admin/students`

## Authentication

All endpoints require admin authentication via Bearer token:

```
Authorization: Bearer <jwt_token>
```

---

## API Endpoints

### 1. Get Promotion Preview

Preview what will happen when promoting all students.

**Endpoint:** `GET /api/admin/students/preview`
**Roles:** Admin

**Response (200):**

```json
{
  "message": "Promotion preview retrieved successfully",
  "summary": {
    "totalActiveStudents": 1250,
    "studentsToPromote": 950,
    "studentsToGraduate": 300,
    "levelBreakdown": [
      {
        "level": "100",
        "count": 400,
        "action": "Promote"
      },
      {
        "level": "200",
        "count": 350,
        "action": "Promote"
      },
      {
        "level": "300",
        "count": 200,
        "action": "Promote"
      },
      {
        "level": "400",
        "count": 300,
        "action": "Graduate"
      }
    ]
  },
  "detailedPreview": [
    {
      "currentLevel": "100",
      "currentCount": 400,
      "nextLevel": "200",
      "action": "Promote",
      "students": [
        {
          "_id": "507f1f77bcf86cd799439011",
          "name": "John Doe",
          "studentId": "CS/2020/001",
          "department": "Computer Engineering"
        }
        // ... more students
      ]
    },
    {
      "currentLevel": "400",
      "currentCount": 300,
      "nextLevel": "Graduated",
      "action": "Graduate",
      "students": [
        {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Jane Smith",
          "studentId": "CS/2017/001",
          "department": "Computer Engineering"
        }
        // ... more students
      ]
    }
  ]
}
```

### 2. Promote All Students

Execute the promotion for all active students.

**Endpoint:** `POST /api/admin/students/promote`
**Roles:** Admin

**Request Body:**

```json
{
  "academic_year": "2024"
}
```

**Response (200):**

```json
{
  "message": "Student promotion completed",
  "summary": {
    "totalProcessed": 1250,
    "totalPromoted": 950,
    "totalGraduated": 300,
    "totalErrors": 0,
    "academicYear": "2024"
  },
  "results": {
    "promoted": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "studentId": "CS/2020/001",
        "department": "Computer Engineering",
        "previousLevel": "100",
        "newLevel": "200"
      }
      // ... more promoted students
    ],
    "graduated": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Jane Smith",
        "studentId": "CS/2017/001",
        "department": "Computer Engineering",
        "previousLevel": "400",
        "newStatus": "Graduated"
      }
      // ... more graduated students
    ],
    "errors": [
      // Any errors that occurred during promotion
    ]
  }
}
```

### 3. Get Graduated Students

Retrieve list of graduated students with filtering options.

**Endpoint:** `GET /api/admin/students/graduates`
**Roles:** Admin

**Query Parameters:**

- `graduation_year` (optional): Filter by graduation year (e.g., "2024")
- `department_id` (optional): Filter by department
- `page` (optional): Page number (default: 1)
- `limit` (optional): Records per page (default: 20, max: 100)

**Example Request:**

```
GET /api/admin/students/graduates?graduation_year=2024&page=1&limit=10
```

**Response (200):**

```json
{
  "message": "Graduated students retrieved successfully",
  "data": {
    "graduates": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Jane Smith",
        "email": "jane.smith@student.university.edu",
        "studentId": "CS/2017/001",
        "department_id": {
          "_id": "507f1f77bcf86cd799439013",
          "name": "Computer Engineering"
        },
        "status": "Graduated",
        "graduationYear": "2024",
        "graduationDate": "2024-06-15T09:00:00.000Z",
        "level": "400",
        "createdAt": "2020-09-01T08:00:00.000Z",
        "updatedAt": "2024-06-15T09:00:00.000Z"
      }
      // ... more graduates
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalRecords": 50,
      "limit": 10
    },
    "statistics": [
      {
        "_id": "2024",
        "totalGraduates": 300,
        "departmentBreakdown": [
          {
            "department": "Computer Engineering",
            "count": 120
          },
          {
            "department": "Agric Engineering",
            "count": 80
          },
          {
            "department": "Food Processing Engineering",
            "count": 60
          },
          {
            "department": "Materials Engineering",
            "count": 40
          }
        ]
      }
    ]
  }
}
```

### 4. Emergency Rollback Promotion

Rollback recent promotions (limited functionality).

**Endpoint:** `POST /api/admin/students/rollback`
**Roles:** Admin

**Request Body:**

```json
{
  "academic_year": "2024",
  "confirm": "true"
}
```

**Response (200):**

```json
{
  "message": "Rollback completed for graduates",
  "warning": "Level promotions cannot be automatically rolled back. Please manually adjust student levels if needed.",
  "results": {
    "graduatesReactivated": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Jane Smith",
        "studentId": "CS/2017/001"
      }
      // ... more reactivated students
    ],
    "errors": []
  },
  "note": "Only graduated students have been reactivated to level 400. For complete rollback, manually adjust other student levels."
}
```

---

## Error Responses

### Validation Error (400)

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "academic_year",
      "message": "Academic year must be a 4-digit year (e.g., '2024')"
    }
  ]
}
```

### No Students Found (404)

```json
{
  "error": "No active students found to promote"
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
  "error": "Access denied. Required roles: Admin"
}
```

### Server Error (500)

```json
{
  "error": "Internal server error"
}
```

---

## Usage Workflow

### Safe Promotion Process

1. **Preview Promotion** - Check what will happen:

   ```bash
   GET /api/admin/students/preview
   ```

2. **Execute Promotion** - Promote all students:

   ```bash
   POST /api/admin/students/promote
   Content-Type: application/json

   {
     "academic_year": "2024"
   }
   ```

3. **Verify Results** - Check graduated students:
   ```bash
   GET /api/admin/students/graduates?graduation_year=2024
   ```

### Emergency Rollback (if needed)

```bash
POST /api/admin/students/rollback
Content-Type: application/json

{
  "academic_year": "2024",
  "confirm": "true"
}
```

---

## Important Notes

### Student Promotion Logic

- **100 → 200**: Students advance to next level
- **200 → 300**: Students advance to next level
- **300 → 400**: Students advance to final level
- **400 → Graduated**: Students marked as graduated (not deleted)

### Graduated Student Handling

- Status changed from "Active" to "Graduated"
- `graduationYear` and `graduationDate` fields populated
- Students remain in database for records
- Can be filtered out of active student queries

### Data Integrity

- All promotions are logged with results
- Failed promotions are captured in error array
- Preview functionality prevents accidental bulk changes
- Rollback available for graduated students only

### Performance Considerations

- Bulk operations process all students efficiently
- Pagination available for large graduate lists
- Indexes on status, level, and graduationYear for fast queries

---

## Sample Scenarios

### End of Academic Year Promotion

```javascript
// 1. Check preview
const preview = await fetch("/api/admin/students/preview");

// 2. Execute promotion
const promotion = await fetch("/api/admin/students/promote", {
  method: "POST",
  body: JSON.stringify({ academic_year: "2024" }),
});

// 3. View graduates
const graduates = await fetch(
  "/api/admin/students/graduates?graduation_year=2024"
);
```

### Department-Specific Graduate Report

```javascript
const deptGraduates = await fetch(
  `/api/admin/students/graduates?graduation_year=2024&department_id=${deptId}`
);
```
