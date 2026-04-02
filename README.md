# Smart Library Book Issue Management System

## Project Overview
A complete Library Management System built with the MERN stack (MongoDB, Express, React-like logic with Vanilla JS, Node.js).
This system allows:
- **Members** to request books, view status, and check fines.
- **Librarians** to manage books, approve requests, issue/return books, and view analytics.

## Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT (JSON Web Tokens)

## Setup Instructions
1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Setup Environment Variables**:
   Create a `.env` file in the root directory and add:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/library_system
   JWT_SECRET=your_jwt_secret_key
   ```
3. **Run Server**:
   ```bash
   npm start
   ```
   Or for development:
   ```bash
   npm run dev
   ```

## Folder Structure
- `backend/`: Server-side code (models, routes, controllers)
- `frontend/`: Client-side code (pages, styles, scripts)
