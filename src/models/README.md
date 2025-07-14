# Models Directory Structure

This directory contains all the Mongoose models organized into logical groups for better maintainability and clarity.

## 📁 Folder Structure

```
models/
├── 📂 core/                    # Base entities
│   ├── user.js                 # User model (all roles)
│   ├── department.js           # Department model
│   └── index.js                # Core models exports
│
├── 📂 academic/                # Course and assignment management
│   ├── course.js               # Course model
│   ├── courseAssignment.js     # Course-Lecturer assignments
│   ├── courseRegistration.js   # Course-Student registrations
│   ├── assignment.js           # Assignment model
│   ├── submission.js           # Assignment submissions
│   └── index.js                # Academic models exports
│
├── 📂 content/                 # Document and file management
│   ├── document.js             # Document model
│   ├── folder.js               # Folder model
│   ├── folderDocument.js       # Folder-Document relationships
│   ├── fileShare.js            # File sharing model
│   └── index.js                # Content models exports
│
├── 📂 communication/           # Messaging and notifications
│   ├── notification.js         # Notification model
│   └── index.js                # Communication models exports
│
├── 📂 utils/                   # Utilities and helpers
│   └── dbInitialization.js     # Database initialization helpers
│
├── 📂 legacy/                  # Legacy models (for backward compatibility)
│   ├── student.js              # Old student model
│   ├── lecturer.js             # Old lecturer model
│   └── hod.js                  # Old HoD model
│
└── index.js                    # Main exports file
```

## 🎯 Model Categories

### 🏛️ Core Models (`./core/`)

- **User**: Unified user model supporting all roles (Student, Lecturer, HoD, Admin)
- **Department**: Department management

### 🎓 Academic Models (`./academic/`)

- **Course**: Course definitions and management
- **CourseAssignment**: Links lecturers to courses
- **CourseRegistration**: Links students to courses
- **Assignment**: Assignment creation and management
- **Submission**: Student assignment submissions with grading

### 📁 Content Models (`./content/`)

- **Document**: File and document management
- **Folder**: Folder organization system
- **FolderDocument**: Links documents to folders
- **FileShare**: File sharing between users

### 📢 Communication Models (`./communication/`)

- **Notification**: Notification system for all users

## 📦 Import Examples

### Import Individual Models

```javascript
import { User, Department } from "./models/core/index.js";
import { Course, Assignment } from "./models/academic/index.js";
import { Document, FileShare } from "./models/content/index.js";
import { Notification } from "./models/communication/index.js";
```

### Import All Models

```javascript
import {
  User,
  Department, // Core
  Course,
  Assignment, // Academic
  Document,
  FileShare, // Content
  Notification, // Communication
} from "./models/index.js";
```

### Import by Category

```javascript
import * as CoreModels from "./models/core/index.js";
import * as AcademicModels from "./models/academic/index.js";
import * as ContentModels from "./models/content/index.js";
import * as CommunicationModels from "./models/communication/index.js";
```

## 🔗 Relationships Overview

### Core Relationships

- **User** belongs to **Department**
- **User** has role-specific fields (studentId for students, etc.)

### Academic Relationships

- **Course** is created by **User** (HoD) and belongs to **Department**
- **CourseAssignment** links **Course** to **User** (Lecturer)
- **CourseRegistration** links **User** (Student) to **Course**
- **Assignment** belongs to **Course** and is created by **User** (Lecturer)
- **Submission** links **User** (Student) to **Assignment**

### Content Relationships

- **Document** is owned by **User**
- **Folder** is owned by **User**
- **FolderDocument** links **Document** to **Folder**
- **FileShare** links **Document** between **Users**

### Communication Relationships

- **Notification** is sent from **User** to **User**

## 🚀 Benefits of This Structure

1. **Better Organization**: Related models are grouped together
2. **Easier Maintenance**: Changes to specific features are localized
3. **Clear Dependencies**: Import only what you need
4. **Scalability**: Easy to add new model categories
5. **Team Collaboration**: Developers can work on specific model groups
6. **Testing**: Easier to test related models together
