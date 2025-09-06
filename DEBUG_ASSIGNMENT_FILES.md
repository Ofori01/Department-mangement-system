# Debug Assignment File Issues

## Common Issues with Assignment Files

### 1. **Invalid ObjectId Format**
The `file_url` field in assignments must be a valid MongoDB ObjectId format (24-character hex string).

**Check your database:**
```javascript
// In MongoDB shell or compass
db.assignments.find({file_url: {$ne: null}}, {title: 1, file_url: 1})
```

### 2. **File Not Found in GridFS**
The `file_url` points to a GridFS file that doesn't exist.

**Check GridFS files:**
```javascript
// In MongoDB shell
db.uploads.files.find({}, {filename: 1, metadata: 1})
```

### 3. **File Info Debugging**
The updated code now provides detailed error messages in the `fileInfo` object:

**Possible fileInfo responses:**
- `null`: No file attached to assignment
- `{error: "Invalid file reference"}`: file_url is not a valid ObjectId
- `{error: "File not found in storage"}`: file_url is valid but file doesn't exist in GridFS
- `{error: "Error retrieving file details"}`: GridFS query failed
- `{originalName, size, uploadDate, downloadUrl}`: Successfully retrieved file info

### 4. **Server Logs**
The updated code now logs detailed information:
- Warning when file_url is invalid ObjectId format
- Warning when file exists in assignment but not in GridFS  
- Error details when file retrieval fails
- Success details when file is found

### 5. **Quick Fixes**

**For existing assignments with invalid file_url:**
```javascript
// Remove invalid file_url references
db.assignments.updateMany(
  {file_url: {$exists: true, $not: /^[0-9a-fA-F]{24}$/}}, 
  {$unset: {file_url: ""}}
)
```

**For orphaned file references:**
```javascript
// Find assignments with file_url that don't exist in GridFS
// This requires manual checking or a custom script
```

## Testing Steps

1. **Check specific assignment:**
   ```bash
   # GET /api/student/assignments?limit=1
   # Look at the fileInfo field in response
   ```

2. **Check server logs:**
   ```bash
   # Look for console.warn and console.error messages
   ```

3. **Check database directly:**
   ```javascript
   // Find assignment with file
   db.assignments.findOne({file_url: {$ne: null}})
   
   // Check if corresponding GridFS file exists
   db.uploads.files.findOne({_id: ObjectId("your-file-url-here")})
   ```

## API Response Examples

**Assignment without file:**
```json
{
  "_id": "...",
  "title": "Assignment 1",
  "fileInfo": null
}
```

**Assignment with valid file:**
```json
{
  "_id": "...",
  "title": "Assignment 2", 
  "fileInfo": {
    "originalName": "assignment2.pdf",
    "size": 1024000,
    "uploadDate": "2025-01-01T10:00:00Z",
    "fileId": "507f1f77bcf86cd799439011",
    "downloadUrl": "/api/student/assignments/123/download"
  }
}
```

**Assignment with invalid file reference:**
```json
{
  "_id": "...",
  "title": "Assignment 3",
  "fileInfo": {
    "fileId": "invalid-id-format",
    "error": "Invalid file reference"
  }
}
```

**Assignment with missing file in storage:**
```json
{
  "_id": "...",
  "title": "Assignment 4",
  "fileInfo": {
    "fileId": "507f1f77bcf86cd799439011",
    "downloadUrl": "/api/student/assignments/456/download",
    "error": "File not found in storage"
  }
}
```
