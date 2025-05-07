
Built by https://www.blackbox.ai

---

# Competitions Management System

نظام إدارة المسابقات والمتسابقات

## Project Overview

The Competitions Management System is a web application designed to manage competitions and contestants effectively. It allows for user authentication, session management, and the handling of competition-related data. Built using Express.js and EJS for the frontend, the application is designed to streamline the process of managing competitions.

## Installation

To install and set up the project locally, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/competitions-management-system.git
   cd competitions-management-system
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create a `.env` file** in the root directory to store your environment variables:
   ```
   PORT=3000
   DATABASE_URL=your_database_url
   SESSION_SECRET=your_session_secret
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   ```

4. **Start the application**:
   ```bash
   npm start
   ```

   For development, you can use:
   ```bash
   npm run dev
   ```

## Usage

Once the application is running, navigate to `http://localhost:3000/` in your browser. You will be redirected to the scores page. You can create an account, log in, and manage contests and participants through the available routes.

## Features

- User authentication with session management
- CRUD operations for contestants, supervisors, competitions, and scores
- Flash messages to display success or error notifications
- Easy data handling with Sequelize ORM for PostgreSQL
- File upload support for contestant data using Multer
- EJS templating engine for dynamic content rendering

## Dependencies

The project includes several dependencies, as listed in the `package.json`:

- **bcryptjs**: Password hashing
- **connect-flash**: Flash messages for notifications
- **dotenv**: Environment variable management
- **ejs**: Templating engine
- **express**: Web framework for Node.js
- **express-session**: Session management for Express
- **method-override**: Support for PUT and DELETE methods in HTML forms
- **multer**: Middleware for handling multipart/form-data
- **pg**: PostgreSQL client for Node.js
- **pg-hstore**: Hstore serializer for PostgreSQL
- **sequelize**: Promise-based ORM for Node.js
- **exceljs**: Excel file handling
- **fast-csv**: CSV parsing and formatting

**Development Dependency**:
- **nodemon**: Automatically restarts the application when file changes are detected during development.

## Project Structure

The project structure is organized as follows:

```
competitions-management-system/
│
├── app.js                     # Main application file
├── config.js                  # Configuration settings and environmental variables
├── models/                    # Database models (Sequelize)
├── routes/                    # Application routes (auth, contestants, supervisors, competitions, scores)
│   ├── auth.js
│   ├── contestants.js
│   ├── supervisors.js
│   ├── competitions.js
│   └── scores.js
├── views/                     # EJS views for rendering
│   ├── errors/                # Error pages (404, 500)
│   └── ...                    # Other views
├── public/                    # Static files (CSS, JS, images)
└── package.json               # Project manifest
```

## License

This project is licensed under the MIT License. See the LICENSE file for details.

---

Feel free to contribute and suggest improvements to the project.