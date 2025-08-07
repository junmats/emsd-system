# School Monitoring System

A comprehensive web application for managing school operations including student records, payments, and charges.

## Features

- **User Authentication**: Secure login system for school administrators
- **Student Management**: CRUD operations for students with grade levels 1-6
- **Grade Level Management**: Individual and batch grade level upgrades
- **Payment Processing**: Handle student payments with manual additional charges
- **Charge Management**: Manage different types of charges (tuition, books, etc.)
- **Payment Records**: Link students with their payment history

## Technology Stack

### Frontend
- Angular 18 with TypeScript
- Bootstrap 5 for responsive UI
- ng-bootstrap for Angular-specific Bootstrap components

### Backend
- Node.js with Express.js
- TypeScript for type safety
- MySQL database
- JWT authentication
- bcryptjs for password hashing

## Prerequisites

- Node.js (v20.x or higher)
- MySQL database
- npm or yarn package manager

## Installation & Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd school-system
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

Update the `.env` file with your database credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=school_system
JWT_SECRET=your_super_secret_jwt_key_here
```

Build and start the backend:
```bash
npm run build
npm start
```

For development:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

The frontend will be available at `http://localhost:4200`
The backend API will be available at `http://localhost:3000`

## Database Schema

The application automatically creates the following tables:
- `users` - System users (admin, staff, teachers)
- `students` - Student records with grade levels
- `charges` - Types of fees and charges
- `payments` - Payment transactions
- `payment_items` - Detailed breakdown of payments
- `student_charges` - Links students to applicable charges

## Default User

You'll need to register the first user via the API or create one directly in the database.

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Students
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student
- `POST /api/students/batch-upgrade` - Batch grade upgrade

### Charges
- `GET /api/charges` - Get all charges
- `GET /api/charges/:id` - Get charge by ID
- `POST /api/charges` - Create new charge
- `PUT /api/charges/:id` - Update charge
- `DELETE /api/charges/:id` - Delete charge

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/:id` - Get payment by ID
- `POST /api/payments` - Create new payment
- `GET /api/payments/student/:id` - Get student payment history
- `DELETE /api/payments/:id` - Delete payment (admin only)

## Development

### Running in Development Mode

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
ng serve
```

### Building for Production

Backend:
```bash
cd backend
npm run build
npm start
```

Frontend:
```bash
cd frontend
ng build
```

## License

This project is licensed under the ISC License.
