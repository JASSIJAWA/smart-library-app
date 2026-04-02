# Deployment & Usage Guide

## Prerequisites
- **Node.js**: v14+ (You have v24.13.0)
- **MongoDB**: Must be installed and running locally on port `27017`.

## Installation
1. Open terminal in project folder `C:\Users\Asus\Desktop\LIB PROJECT`.
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application
### 1. Start MongoDB
Ensure MongoDB service is running. If not, start it:
```bash
mongod
```
(Or open MongoDB Compass and connect to `mongodb://localhost:27017`)

### 2. Start Backend Server
In the project folder:
```bash
npm start
```
You should see:
```
Server running on port 5000
MongoDB Connected: ...
```

### 3. Open Frontend
Simply open `frontend/index.html` in your browser.
(You can double-click the file in File Explorer or use Live Server in VS Code).

## Testing Workflow (Manual)
### Step 1: Member Registration
1. Open `index.html`.
2. Click "Register".
3. Sign up as a Member (e.g., `member@test.com`, `123456`).
4. Login. You will see "Member Dashboard".

### Step 2: Librarian Setup
Since there is no "Admin" UI to create Librarians, you can register a user normally, then manually change their role in MongoDB (using Compass or Shell) to `Librarian`.
**OR** use Postman to register with `role: "Librarian"` (if backend allows - our code currently defaults to 'Member' unless 'role' is sent in body, which the frontend form doesn't send).

**Quick Fix for Testing**:
The registration API accepts `role`. You can use Postman:
- **POST** `http://localhost:5000/api/auth/register`
- **Body (JSON)**:
  ```json
  {
    "name": "Librarian Doe",
    "email": "lib@test.com",
    "password": "123",
    "role": "Librarian"
  }
  ```

### Step 3: Full Cycle
1. **Librarian**: Login -> Add a Book (e.g., "The Great Gatsby", Stock: 5).
2. **Member**: Login -> Click "Request" on that book.
3. **Librarian**: Go to "Requests" -> See "Requested" status -> Click "Approve".
4. **Librarian**: Click "Issue" -> Enter 7 days. Status becomes "Issued".
5. **Member**: Check "My Requests". See Due Date.
6. **Librarian**: Click "Return". Book stock increases.

## API Endpoints
- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`
- **Books**: `GET /api/books`, `POST /api/books` (Lib), `DELETE /api/books/:id` (Lib)
- **Requests**: `GET /api/requests` (Auth), `POST /api/requests` (Member), `PUT /api/requests/:id` (Lib)
- **Analytics**: `GET /api/analytics` (Lib)

## Troubleshooting
### ❌ Error: "npm.ps1 cannot be loaded because running scripts is disabled"
This is a Windows PowerShell security setting.
**Fix**:
1. Open PowerShell as Administrator (or just use your current terminal).
2. Run this command:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. Type `Y` (Yes) and press Enter.
4. Try `npm start` again.

**Alternative**: Use **Command Prompt (cmd)** instead of PowerShell.
