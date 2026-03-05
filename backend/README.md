# Backend API Documentation

This directory contains the backend codebase for the **Commit31 Lost and Found** platform, built with Node.js, Express, and MongoDB.

## Folder Structure

```text
backend/
├── config/
│   └── db.js              # MongoDB connection setup
├── controllers/
│   ├── authController.js  # Registration and login logic with JWT
│   └── userController.js  # User profile operations (placeholder)
├── middlewares/
│   └── authMiddleware.js  # JWT token verification (protect middleware)
├── models/
│   ├── userModel.js       # User schema (with bcrypt password hashing)
│   ├── itemModel.js       # Lost/Found item schema
│   ├── claimModel.js      # Item claim/verification schema
│   └── messageModel.js    # User-to-user messaging schema
├── routes/
│   ├── auth.js            # Auth routes (/api/auth)
│   └── user.js            # User routes (/api/users) — protected
├── utils/
│   └── generateToken.js   # JWT token generation utility
├── .env                   # Environment variables (JWT_SECRET, JWT_EXPIRE)
├── package.json
└── server.js              # Entry point and server configuration
```

## Getting Started

### Prerequisites
- Node.js installed
- MongoDB running locally or a MongoDB Atlas URI

### Installation
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file and configure:
   ```env
   JWT_SECRET=your_secret_key
   JWT_EXPIRE=7d
   MONGO_URI=mongodb://127.0.0.1:27017/uni_find   # optional, defaults to this
   ```

### Running the Server
```bash
npm run dev     # Development mode (nodemon)
npm start       # Production mode
```
The server runs on `http://localhost:5000` by default.

---

## API Routes

### 1. Authentication Routes
**Base URL:** `/api/auth`

#### Register User
- **Endpoint:** `POST /register`
- **Description:** Registers a new user and returns a JWT token.
- **Request Body (JSON):**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123",
    "role": "student",
    "contactNumber": "9876543210"
  }
  ```
  > `role` and `contactNumber` are optional. `role` defaults to `student`.
- **Response (201 Created):**
  ```json
  {
    "_id": "...",
    "email": "john@example.com",
    "role": "student",
    "message": "User registered successfully",
    "token": "eyJhbGciOi..."
  }
  ```

#### Login User
- **Endpoint:** `POST /login`
- **Description:** Authenticates a user and returns a JWT token.
- **Request Body (JSON):**
  ```json
  {
    "email": "john@example.com",
    "password": "securepassword123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "_id": "...",
    "email": "john@example.com",
    "role": "student",
    "message": "User logged in successfully",
    "token": "eyJhbGciOi..."
  }
  ```

---

### 2. User Routes
**Base URL:** `/api/users`

#### Get Current User Profile
- **Endpoint:** `GET /me`
- **Description:** Protected route — requires a valid JWT token.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
  ```json
  {
    "message": "User profile endpoint - To be implemented"
  }
  ```

---

## Authentication Flow

1. **Register** or **Login** to receive a JWT token.
2. Include the token in the `Authorization` header for protected routes:
   ```text
    Authorization: Bearer <your_token>
    ```
3. The `protect` middleware verifies the token and grants access to the route.

---

## Database Schemas

| Collection | Description |
|---|---|
| **User** | Student accounts with name, email, password (hashed), role, and contact number |
| **Item** | Lost/found item reports with category, location, date, and status tracking |
| **Claim** | Verification requests linking a claimer to an item with proof description |
| **Message** | Direct messages between users, optionally linked to a specific item |
