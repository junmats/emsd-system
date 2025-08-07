# EMSD School Monitoring System

A comprehensive full-stack web application for school administration and student management.

## 🏫 Overview

The EMSD School Monitoring System is a professional web application designed to streamline school administration tasks including student management, payment processing, and charge management for grades 1-6.

## ✨ Features

### 🔐 Authentication & Security
- JWT-based authentication system
- Protected routes with authentication guards
- Secure login/logout functionality
- Role-based access control

### 👨‍🎓 Student Management
- Complete CRUD operations for students
- Grade level management (Grades 1-6)
- Individual and batch grade level upgrades
- Student information tracking

### 💰 Payment Processing
- Handle student payments
- Manual additional charges
- Payment history tracking
- Link students with payment records

### 📊 Charge Management
- Manage different types of charges (tuition, books, etc.)
- Flexible charge categories
- Charge assignment to students

### 🎨 Professional UI/UX
- Modern responsive design
- Professional sidebar navigation
- Gray, white, and maroon color scheme
- Collapsible sidebar with user management
- Bootstrap 5 integration with Font Awesome icons

## 🛠️ Tech Stack

### Frontend
- **Framework**: Angular 18
- **Language**: TypeScript
- **Styling**: Bootstrap 5, SCSS
- **Icons**: Font Awesome 6.4.0
- **Architecture**: Standalone components

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Authentication**: JWT (JSON Web Tokens)
- **API**: RESTful API design

### Database
- **Database**: MySQL 9.0
- **Schema**: Relational database with proper constraints
- **Tables**: Users, Students, Payments, Charges, and relationships

## 🚀 Getting Started

### Prerequisites
- Node.js (v20.16.0 or higher)
- MySQL (v9.0 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/junmats/emsd-school-system.git
   cd emsd-school-system
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Create environment file
   cp .env.example .env
   # Edit .env with your database credentials
   
   # Start the backend server
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Start the development server
   npm start
   ```

4. **Database Setup**
   - Create a MySQL database named `emsd_system`
   - The application will automatically create tables and seed initial data
   - Default admin credentials: `admin` / `admin123`

### Development Servers
- **Frontend**: http://localhost:4200
- **Backend**: http://localhost:3000
- **Database**: MySQL on port 3306

## 📁 Project Structure

```
emsd-school-system/
├── frontend/                 # Angular 18 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/   # Feature components
│   │   │   ├── services/     # Angular services
│   │   │   ├── guards/       # Route guards
│   │   │   └── interceptors/ # HTTP interceptors
│   │   └── themes/           # Theme configurations
├── backend/                  # Node.js/Express API
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── middleware/      # Express middleware
│   │   └── routes/          # API route handlers
└── README.md
```

## 🎨 Themes

The application supports multiple themes:
- **Current**: Gray, White, and Maroon professional theme
- **Available**: Blue professional theme (saved in `/themes/`)

## 🔧 Development

### Available Scripts

**Frontend**
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run unit tests

**Backend**
- `npm run dev` - Start with nodemon (auto-reload)
- `npm start` - Start production server
- `npm run build` - Compile TypeScript

### Git Workflow
```bash
# Check current status
git status

# Create feature branch
git checkout -b feature/new-feature

# Commit changes
git add .
git commit -m "Add new feature"

# Push to GitHub
git push origin feature/new-feature
```

## 📄 License

This project is private and proprietary to EMSD.

## 👥 Contributing

This is a private repository. Please contact the administrator for access.

## 📞 Support

For support and questions, please contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: August 7, 2025  
**Developed by**: EMSD Development Team

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
