# Academic Management System Backend

A comprehensive backend API for managing academic institutions, including students, lecturers, heads of departments, and administrators.

## Features

### User Roles

- **Students**: Course registration, assignment submission, notifications
- **Lecturers**: Assignment creation, grading, course management, document sharing
- **Head of Department (HoD)**: Course oversight, lecturer management, student administration
- **Admin**: System administration, user management, bulk operations

### Core Functionality

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **File Management**: GridFS integration for document storage and retrieval
- **Course Management**: Complete course lifecycle management
- **Assignment System**: Assignment creation, submission, and grading
- **Notification System**: Real-time notifications for all users
- **Document Sharing**: Secure file upload and download with folder organization

## Technology Stack

- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **File Storage**: GridFS for MongoDB
- **Authentication**: JWT tokens with bcrypt password hashing
- **Validation**: Express-validator for input validation
- **Security**: Helmet, CORS, rate limiting
- **File Upload**: Multer with GridFS storage

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd "application backend"
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file with your configuration:

   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/academic_management_system
   JWT_SECRET=your_jwt_secret_here
   JWT_REFRESH_SECRET=your_refresh_secret_here
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Student Routes (`/api/student`)

- `GET /courses` - Get enrolled courses
- `POST /courses/:id/register` - Register for a course
- `GET /assignments` - Get assignments
- `POST /assignments/:id/submit` - Submit assignment
- `GET /notifications` - Get notifications

### Lecturer Routes (`/api/lecturer`)

- `GET /courses` - Get assigned courses
- `POST /assignments` - Create assignment
- `GET /assignments/:id/submissions` - Get assignment submissions
- `PUT /submissions/:id/grade` - Grade submission
- `POST /documents` - Upload document

### HoD Routes (`/api/hod`)

- `POST /courses` - Create course
- `POST /lecturers/:id/courses` - Assign course to lecturer
- `POST /students/:id/register` - Register student to course
- `GET /department/overview` - Get department overview
- `POST /notifications/send` - Send notifications

### Admin Routes (`/api/admin`)

- `POST /folders` - Create folder
- `POST /documents` - Upload document
- `GET /users/search` - Search users
- `POST /notifications` - Send notification
- `POST /notifications/bulk` - Send bulk notification
- `GET /stats` - Get system statistics

### File Management (`/api/files`)

- `GET /download/:id` - Download file
- `GET /stream/:id` - Stream file (for videos/audio)

## Project Structure

```
src/
├── app.js                 # Main application file
├── config/
│   ├── db.js             # Database configuration
│   └── env.js            # Environment configuration
├── controllers/
│   ├── admin/            # Admin controllers
│   ├── hod/              # HoD controllers
│   ├── lecturer/         # Lecturer controllers
│   ├── student/          # Student controllers
│   ├── authController.js # Authentication controller
│   └── fileController.js # File management controller
├── middleware/
│   ├── auth.js           # Authentication middleware
│   ├── fileUpload.js     # File upload middleware
│   ├── validation.js     # Validation middleware
│   └── errorHandler.js   # Global error handler
├── models/
│   ├── core/             # Core models (User, Department)
│   ├── academic/         # Academic models (Course, Assignment, etc.)
│   ├── content/          # Content models (Document, Folder)
│   └── communication/    # Communication models (Notification)
└── routes/
    ├── admin/            # Admin routes
    ├── hod/              # HoD routes
    ├── lecturer/         # Lecturer routes
    ├── student/          # Student routes
    ├── authRoutes.js     # Authentication routes
    ├── fileRoutes.js     # File management routes
    └── index.js          # Main routes file
```

## Database Models

### Core Models

- **User**: Base user model with role-based differentiation
- **Department**: Academic departments

### Academic Models

- **Course**: Course information and management
- **Assignment**: Assignment details and requirements
- **Submission**: Student assignment submissions
- **Grade**: Grading system
- **Enrollment**: Course enrollment tracking

### Content Models

- **Document**: File metadata and storage information
- **Folder**: Hierarchical folder organization

### Communication Models

- **Notification**: System notifications

## Development

### Running in Development Mode

```bash
npm run dev
```

### Code Structure Guidelines

- Use ES6 modules and async/await
- Implement proper error handling
- Follow RESTful API conventions
- Use middleware for cross-cutting concerns
- Validate all inputs
- Implement proper authentication and authorization

### Testing

Health check endpoint: `GET /health`

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Rate Limiting**: Prevent API abuse
- **CORS**: Cross-origin resource sharing configuration
- **Input Validation**: Comprehensive input validation
- **Role-based Access Control**: Fine-grained permissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
