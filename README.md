# HOD Backend Project

This project is a backend application for managing Head of Department (HOD) data. It connects to a database and provides RESTful API endpoints for creating, retrieving, updating, and deleting HOD information.

## Project Structure

```
hod-backend
├── src
│   ├── app.js                # Entry point of the application
│   ├── config
│   │   └── db.js            # Database connection configuration
│   ├── controllers
│   │   └── hodController.js  # Controller for HOD-related requests
│   ├── models
│   │   └── hod.js            # HOD data model
│   ├── routes
│   │   └── hodRoutes.js      # Routes for HOD-related endpoints
│   └── utils
│       └── index.js          # Utility functions
├── package.json               # NPM configuration file
└── README.md                  # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd hod-backend
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Configure the database:**
   - Update the `src/config/db.js` file with your database connection details.

4. **Run the application:**
   ```
   npm start
   ```

## API Endpoints

- **Create HOD**
  - `POST /api/hod`
  - Request Body: `{ "name": "Prof. Kofi Ansah", "department": "Computer Science", "email": "k.ansah@univ.edu.gh" }`

- **Get HOD**
  - `GET /api/hod/:id`

- **Update HOD**
  - `PUT /api/hod/:id`
  - Request Body: `{ "name": "Updated Name", "department": "Updated Department", "email": "updated.email@univ.edu.gh" }`

- **Delete HOD**
  - `DELETE /api/hod/:id`

## Usage Examples

- To create a new HOD, send a POST request to `/api/hod` with the required data.
- To retrieve an HOD's information, send a GET request to `/api/hod/:id` with the HOD's ID.
- To update an HOD's information, send a PUT request to `/api/hod/:id` with the updated data.
- To delete an HOD, send a DELETE request to `/api/hod/:id`.

## License

This project is licensed under the MIT License.