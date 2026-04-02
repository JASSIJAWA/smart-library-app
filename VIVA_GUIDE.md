# Student Viva Guide & Explanation

## Project: Smart Library Book Issue Management System

### 1. Why did you use this "Workflow" (Requested -> Approved -> Issued -> Returned)?
**Answer**: "A library system needs strict control over books. We can't just let anyone take a book without approval.
1. **Requested**: The member shows interest.
2. **Approved**: The librarian confirms the book is available and the member is eligible.
3. **Issued**: The physical exchange happens, and the due date is set. The stock decreases here.
4. **Returned**: The book is back, stock increases, and we check for fines.
This 'State Machine' ensures data integrity and prevents issues like giving out the same book twice."

### 2. Why JWT (JSON Web Tokens)?
**Answer**: "JWT is a stateless authentication method.
- **Stateless**: The server doesn't need to store session data in RAM, making it scalable.
- **Secure**: The token is signed with a secret key. If anyone tampers with it, the server rejects it.
- **Convenient**: We can store the user's Role and ID inside the token, so the frontend knows who is logged in without asking the server constantly."

### 3. Why MongoDB (NoSQL)?
**Answer**: "Libraries have flexible data.
- **Flexible Schema**: If we want to add a new detailed field to only some books (like 'Illustrator' for comics), MongoDB handles it easily without changing the whole database table structure like SQL.
- **JSON Compatibility**: We are using JavaScript (Node.js) and JSON everywhere. MongoDB stores data as BSON (Binary JSON), so it feels very natural to use with Node.js."

### 4. How is the Fine Calculated?
**Answer**: "We calculate fines based on the **Due Date** vs **Return Date**.
- When a book is returned, the system checks: `if (Current Date > Due Date)`.
- We calculate the difference in milliseconds, convert it to days.
- `Fine = Overdue Days * Fine Per Day (e.g., $10)`.
- This is stored in the database for record-keeping."

## Common Terminology
- **Middleware**: A function that runs *before* the request reaches the final controller. We use it to check if the user is Logged In (Auth Middleware) and if they are a Librarian (Role Middleware).
- **Schema**: The blueprint of our data (e.g., a Book must have a Title and Author).
- **CRUD**: Create, Read, Update, Delete (The 4 basic operations of any database app).
