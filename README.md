# Library Management System Backend

Backend for a **Library Management System (LMS)** built using **Node.js**, **Express**, and **MySQL**. This backend provides APIs for user and admin authentication, book management, loan handling, reviews, and more.

---

## Features

- **User & Admin Authentication** – Secure login with role-based access.
- **Book Management** – Add, update, delete, and search books.
- **Loan Requests & Management** – Request, approve, and track loans.
- **Fine Tracking & Payment** – Monitor overdue fines and payment status.
- **Reviews & Ratings** – Users can rate and review books.
- **Interlibrary Loan Requests** – Request books from other libraries.

---

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Other:** dotenv for environment variables, (add cors if used)

---

## Prerequisites

- Node.js v14+ (tested on v18 LTS)
- MySQL v5.7+

---

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/library-management-system.git
   cd library-management-system
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up the database:**
   - Create a MySQL database (e.g., `lms_db`).
   - Run the SQL script located at `database/finale.sql` to create tables and sample data.
   - Update your `.env` file with your database credentials:
     ```dotenv
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=yourpassword
     DB_NAME=lms_db
     PORT=5500
     ```

4. **Start the server:**
   ```bash
   npm start
   ```
   - Backend API will run at [http://localhost:5500/](http://localhost:5500/)

---

## API Endpoints (Sample)

| Method | Endpoint            | Description                  | Access       |
|--------|-------------------|------------------------------|--------------|
| POST   | `/api/login`       | Login for user/admin         | Public       |
| GET    | `/api/books`       | Get all books                | Public       |
| POST   | `/api/books`       | Add a new book               | Admin only   |
| POST   | `/api/loan/request`| Request a book loan          | User only    |

> You can test all APIs using Postman or any API client.

---

## Folder Structure

```
FINALE/
├── AdminDashboard/
│   ├── admin_dashboard.css
│   ├── admin_dashboard.html
│   └── admin_dashboard.js
├── UserDashboard/
│   ├── user_dashboard.css
│   ├── user_dashboard.html
│   └── user_dashboard.js
├── login_page/
│   ├── login.css
│   ├── login.html
│   └── login.js
├── database/
│   └── finale.sql
├── node_modules/
├── server.js
├── .env
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

---

## Contributing

Contributions are welcome! Please fork the repo and submit pull requests for bug fixes or improvements.

---

## License

All rights reserved © Dhruv Jain 2025.

---

## Author

[Dhruv Jain](https://www.linkedin.com/in/dhruv-jain-a958772a6/) – B.Tech CSE, Class of 2027