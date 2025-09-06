# Admin File Management API Documentation

This document provides examples of how admins can move and share files using the new API endpoints.

## File Moving

### Move Document to Another Folder

**Endpoint:** `POST /api/admin/documents/:id/move`

**Request:**

```json
{
  "folder_id": "60d0fe4f5311236168a109ca"
}
```

**Sample Response:**

```json
{
  "success": true,
  "message": "Document moved successfully",
  "data": {
    "document_id": "60d0fe4f5311236168a109cb",
    "moved_to": {
      "_id": "60d0fe4f5311236168a109ca",
      "name": "Important Documents",
      "status": "Pending"
    }
  }
}
```

**Error Response (Document already in folder):**

```json
{
  "success": false,
  "message": "Document is already in this folder"
}
```

## File Sharing

### Share Document with Multiple Users

**Endpoint:** `POST /api/admin/documents/:id/share`

**Request:**

```json
{
  "user_ids": [
    "60d0fe4f5311236168a109cc",
    "60d0fe4f5311236168a109cd",
    "60d0fe4f5311236168a109ce"
  ]
}
```

**Sample Response:**

```json
{
  "success": true,
  "message": "Document shared with 3 user(s)",
  "data": {
    "shares": [
      {
        "_id": "60d0fe4f5311236168a109cf",
        "file_id": "60d0fe4f5311236168a109cb",
        "shared_by": "60d0fe4f5311236168a109c9",
        "shared_with": {
          "_id": "60d0fe4f5311236168a109cc",
          "name": "John Doe",
          "email": "john.doe@university.edu",
          "role": "Student"
        },
        "shared_at": "2024-01-15T10:30:00.000Z",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "errors": [
      {
        "user_id": "60d0fe4f5311236168a109cd",
        "error": "Document already shared with this user"
      }
    ]
  }
}
```

### View Document Shares

**Endpoint:** `GET /api/admin/documents/:id/shares`

**Sample Response:**

```json
{
  "success": true,
  "data": {
    "document": {
      "_id": "60d0fe4f5311236168a109cb",
      "title": "Course Syllabus 2024",
      "visibility": "private"
    },
    "shares": [
      {
        "_id": "60d0fe4f5311236168a109cf",
        "file_id": "60d0fe4f5311236168a109cb",
        "shared_by": "60d0fe4f5311236168a109c9",
        "shared_with": {
          "_id": "60d0fe4f5311236168a109cc",
          "name": "John Doe",
          "email": "john.doe@university.edu",
          "role": "Student",
          "department_id": {
            "_id": "60d0fe4f5311236168a109d0",
            "name": "Computer Science",
            "code": "CS"
          }
        },
        "shared_at": "2024-01-15T10:30:00.000Z",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "total": 3
  }
}
```

### Remove Document Share

**Endpoint:** `DELETE /api/admin/documents/:id/shares/:shareId`

**Sample Response:**

```json
{
  "success": true,
  "message": "Document share removed successfully"
}
```

## User Access to Shared Files

### View Shared Files (Available to All Users)

**Endpoint:** `GET /api/files/shared?page=1&limit=10`

**Sample Response:**

```json
{
  "success": true,
  "data": {
    "shares": [
      {
        "_id": "60d0fe4f5311236168a109cf",
        "file_id": {
          "_id": "60d0fe4f5311236168a109cb",
          "owner_id": "60d0fe4f5311236168a109c9",
          "title": "Course Syllabus 2024",
          "visibility": "private",
          "created_at": "2024-01-14T09:15:00.000Z",
          "fileInfo": {
            "originalName": "syllabus_2024.pdf",
            "size": 245760,
            "uploadDate": "2024-01-14T09:15:00.000Z",
            "contentType": "application/pdf"
          }
        },
        "shared_by": {
          "_id": "60d0fe4f5311236168a109c9",
          "name": "Admin User",
          "email": "admin@university.edu",
          "role": "Admin"
        },
        "shared_with": "60d0fe4f5311236168a109cc",
        "shared_at": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "total": 1,
      "count": 1,
      "totalRecords": 1
    }
  }
}
```

## File Download Access Control

The file download endpoints (`/api/files/download/:id` and `/api/files/stream/:id`) now include access control for shared files:

1. **File Owner**: Can always download their files
2. **Public Files**: Anyone can download
3. **Admin/HoD**: Can download any file
4. **Shared Files**: Users can download files shared with them
5. **Private Files**: Only accessible by owner, admins, HoDs, or users the file is shared with

## Error Responses

### Access Denied

```json
{
  "success": false,
  "message": "Access denied"
}
```

### Document Not Found

```json
{
  "success": false,
  "message": "Document not found or access denied"
}
```

### Validation Errors

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "user_ids",
      "message": "User IDs must be a non-empty array"
    }
  ]
}
```

## Usage Notes

1. **File Moving**: Admins can only move documents they own between folders they own
2. **File Sharing**: Admins can share their documents with any users in the system
3. **Notifications**: When a document is shared or unshared, the recipient receives a notification
4. **Access Control**: Shared files respect the existing permission system
5. **Error Handling**: The API provides detailed error messages for troubleshooting

## Sample cURL Commands

### Move a document

```bash
curl -X POST "http://localhost:3000/api/admin/documents/60d0fe4f5311236168a109cb/move" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"folder_id": "60d0fe4f5311236168a109ca"}'
```

### Share a document

```bash
curl -X POST "http://localhost:3000/api/admin/documents/60d0fe4f5311236168a109cb/share" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_ids": ["60d0fe4f5311236168a109cc", "60d0fe4f5311236168a109cd"]}'
```

### View shared files

```bash
curl -X GET "http://localhost:3000/api/files/shared?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
