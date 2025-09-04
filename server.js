import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'a3b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3e4f5';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Serve static frontend files (Only keep this block, remove other duplicates)
app.use(express.static(path.join(__dirname, "login_page")));
app.use("/UserDashboard", express.static(path.join(__dirname, "UserDashboard")));
app.use("/AdminDashboard", express.static(path.join(__dirname, "AdminDashboard")));

// Middleware
app.use(cors({
  origin: 'http://127.0.0.1:3000', // ✅ Allow requests from frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // ✅ Allow necessary methods
  allowedHeaders: ['Content-Type', 'Authorization'], // ✅ Allow necessary headers
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Redirect root to login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login_page', 'login.html'));
});

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'finale',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();

// Authentication middleware
function authenticateToken(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');  // Extract token from Authorization header

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    req.user = user;  // Attach the decoded user information to the request object
    next();  // Proceed to the next middleware/handler (borrow book logic)
  });
}

// Role-based authorization middleware
const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

// Routes

//Registration routes
app.post("/api/register", async (req, res) => {
  const { firstName, lastName, email, phone, address } = req.body;

  if (!email || !firstName || !lastName || !address) {
      return res.status(400).json({ message: "All fields are required." });
  }

  try {
      // Check if the user already exists
      const [existingUser] = await pool.query("SELECT * FROM Member WHERE Email = ?", [email]);
      if (existingUser.length) {
          return res.status(409).json({ message: "User already exists." });
      }

      // Generate a new MemberID
      const [lastUser] = await pool.query("SELECT MemberID FROM Member ORDER BY MemberID DESC LIMIT 1");
      const newId = (lastUser.length > 0) 
          ? `M${String(parseInt(lastUser[0].MemberID.slice(1)) + 1).padStart(3, "0")}` 
          : "M001";

      // Insert new user with MembershipType as 'Regular'
      await pool.query(
          "INSERT INTO Member (MemberID, FirstName, LastName, Email, Phone, Address, MembershipDate, MembershipType) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)",
          [newId, firstName, lastName, email, phone || null, address, "Regular"]
      );

      res.status(201).json({ message: "Registration successful!", memberId: newId });
  } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({ message: "Internal Server Error" });
  }
});

// Authentication Routes
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required' });
    }
    
    let table, idField, query;
    
    if (role === 'admin') {
      table = 'Staff';
      idField = 'StaffID';
      query = 'SELECT StaffID, FirstName, LastName, Email FROM Staff WHERE Email = ?';
    } else {
      table = 'Member';
      idField = 'MemberID';
      query = 'SELECT MemberID, FirstName, LastName, Email FROM Member WHERE Email = ?';
    }
    
    const [rows] = await pool.execute(query, [email]);
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const user = rows[0];
    
    // Hardcoded password check
    let isValidPassword = (role === 'admin' && password === 'admin1234') ||
                          (role === 'user' && password === 'user1234');

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Create and assign token
   const token = jwt.sign(
      { 
        id: user[idField], 
        email: user.Email, 
        role: role,
        name: `${user.FirstName} ${user.LastName}`
      }, 
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send response with token and user details
    res.status(200).json({ 
      token,
      user: {
        id: user[idField],
        name: `${user.FirstName} ${user.LastName}`,
        email: user.Email,
        role: role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Book Routes

// Search books including keywords
app.get('/api/books', async (req, res) => {
  try {
    const { query, filter } = req.query;
    
    let sqlQuery = `
      SELECT b.*, 
             GROUP_CONCAT(DISTINCT a.FirstName, ' ', a.LastName) AS Authors,
             p.Name AS PublisherName, 
             GROUP_CONCAT(DISTINCT g.Name) AS Genres,
             GROUP_CONCAT(DISTINCT k.Word) AS Keywords
      FROM Book b
      LEFT JOIN BOOK_AUTHOR ba ON b.BookID = ba.BookID
      LEFT JOIN Author a ON ba.AuthorID = a.AuthorID
      LEFT JOIN Publisher p ON b.PublisherID = p.PublisherID
      LEFT JOIN BOOK_GENRE bg ON b.BookID = bg.BookID
      LEFT JOIN Genre g ON bg.GenreID = g.GenreID
      LEFT JOIN BOOK_KEYWORD bk ON b.BookID = bk.BookID
      LEFT JOIN Keyword k ON bk.KeywordID = k.KeywordID
      WHERE 1=1
    `;

    const params = [];

    // Check if query is provided (title, author, summary, keyword, and bookID search)
    if (query) {
      sqlQuery += `
        AND (LOWER(b.Title) LIKE LOWER(?) OR LOWER(a.FirstName) LIKE LOWER(?) OR LOWER(a.LastName) LIKE LOWER(?) OR LOWER(b.Summary) LIKE LOWER(?) OR LOWER(k.Word) LIKE LOWER(?) OR LOWER(b.BookID) LIKE LOWER(?))
      `;
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm); // Add keyword and BookID search
    }

    // Filter by genre if provided
    if (filter && filter !== 'all') {
      sqlQuery += ` AND g.Name = ?`;
      params.push(filter);
    }

    sqlQuery += ` GROUP BY b.BookID`;

    // Execute the query
    const [rows] = await pool.execute(sqlQuery, params);

    // Return the result
    res.status(200).json(rows);
  } catch (error) {
    console.error('❌ Search books error:', error.stack); // Log full error stack
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message  // Send error message in response
    });
  }
});

//Total Books Dashboard
app.get("/api/books/count", async (req, res) => {
  try {
      const [result] = await pool.query("SELECT COUNT(*) AS total FROM Book_Copy WHERE AvailabilityStatus = 'Available'");
      res.json({ totalBooks: result[0].total });
  } catch (error) {
      console.error("Error fetching book count:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

//Total Members Dashboard
app.get("/api/members/active", async (req, res) => {
  try {
      const [result] = await pool.query(`
          SELECT COUNT(*) AS activeMembers
          FROM Member
      `);
      res.json({ activeMembers: result[0].activeMembers });
  } catch (error) {
      console.error("Error fetching active members:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

//Active Loans Dashboard
app.get("/api/loans/active", async (req, res) => {
  try {
      const [result] = await pool.query(`
          SELECT COUNT(*) AS activeLoans 
          FROM Loan 
          WHERE Status = 'Borrowed'
      `);
      res.json({ activeLoans: result[0].activeLoans });
  } catch (error) {
      console.error("Error fetching active loans:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

//Returned Books Dashboard
app.get("/api/books/returned", async (req, res) => {
  try {
      const [result] = await pool.query(`
          SELECT COUNT(*) AS returnedBooks 
          FROM Loan 
          WHERE Status = 'Returned'
      `);
      res.json({ returnedBooks: result[0].returnedBooks });
  } catch (error) {
      console.error("Error fetching returned books count:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

//Loans Route
app.get("/api/loans", async (req, res) => {
  try {
      const [loans] = await pool.query(`
          SELECT Loan.LoanID, Book.Title AS BookTitle, 
                 CONCAT(Member.FirstName, ' ', Member.LastName) AS MemberName, 
                 Loan.LoanDate, Loan.DueDate, Loan.ReturnDate, Loan.Status
          FROM Loan
          JOIN Member ON Loan.MemberID = Member.MemberID
          JOIN Loan_Details ON Loan.LoanID = Loan_Details.LoanID
          JOIN Book_Copy ON Loan_Details.CopyID = Book_Copy.CopyID
          JOIN Book ON Book_Copy.BookID = Book.BookID
          ORDER BY Loan.LoanDate DESC
      `);

      res.json(loans);
  } catch (error) {
      console.error("Error fetching loans:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// Load review
app.get("/api/reviews", async (req, res) => {
  try {
      const query = `
          SELECT r.ReviewID, r.ReviewText, b.Title AS BookTitle, 
                 CONCAT(m.FirstName, ' ', m.LastName) AS MemberName, 
                 ra.Score
          FROM Review r
          JOIN Book b ON r.BookID = b.BookID
          JOIN Member m ON r.MemberID = m.MemberID
          LEFT JOIN Rating ra ON r.BookID = ra.BookID AND r.MemberID = ra.MemberID`;

      const [reviews] = await pool.execute(query);
      res.json(reviews);
  } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/api/reviews/:id", async (req, res) => {
  const reviewId = req.params.id;
  try {
      await pool.execute("DELETE FROM Review WHERE ReviewID = ?", [reviewId]);
      res.json({ message: "Review deleted successfully" });
  } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});


// Get book details
app.get('/api/view-book/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get book details
    const [bookRows] = await pool.execute(`
      SELECT b.*, p.Name AS PublisherName
      FROM Book b
      LEFT JOIN Publisher p ON b.PublisherID = p.PublisherID
      WHERE b.BookID = ?
    `, [id]);
    
    if (bookRows.length === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    const book = bookRows[0];
    
    // Get authors
    const [authorRows] = await pool.execute(`
      SELECT a.*
      FROM Author a
      JOIN BOOK_AUTHOR ba ON a.AuthorID = ba.AuthorID
      WHERE ba.BookID = ?
    `, [id]);
    
    // Get genres
    const [genreRows] = await pool.execute(`
      SELECT g.*
      FROM Genre g
      JOIN BOOK_GENRE bg ON g.GenreID = bg.GenreID
      WHERE bg.BookID = ?
    `, [id]);
    
    // Get availability
    const [copyRows] = await pool.execute(`
      SELECT COUNT(*) AS TotalCopies,
             SUM(CASE WHEN AvailabilityStatus = 'Available' THEN 1 ELSE 0 END) AS AvailableCopies
      FROM Book_Copy
      WHERE BookID = ?
    `, [id]);
    
    // Get ratings
    const [ratingRows] = await pool.execute(`
      SELECT AVG(Score) AS AverageRating, COUNT(*) AS RatingCount
      FROM Rating
      WHERE BookID = ?
    `, [id]);
    
    // Get reviews
    const [reviewRows] = await pool.execute(`
      SELECT r.*, m.FirstName, m.LastName
      FROM Review r
      JOIN Member m ON r.MemberID = m.MemberID
      WHERE r.BookID = ?
    `, [id]);
    
    const bookDetails = {
      ...book,
      authors: authorRows,
      genres: genreRows,
      availability: copyRows[0],
      rating: ratingRows[0],
      reviews: reviewRows
    };
    
    res.status(200).json(bookDetails);
  } catch (error) {
    console.error('View book error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

//Borrow Book
app.post('/api/borrow-book/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const memberId = req.user.id;
    
    // Check if book exists and is available
    const [bookRows] = await pool.execute(`
      SELECT COUNT(*) AS AvailableCopies
      FROM Book_Copy
      WHERE BookID = ? AND AvailabilityStatus = 'Available'
    `, [id]);
    
    if (bookRows[0].AvailableCopies === 0) {
      return res.status(400).json({ success: false, message: 'Book is not available for borrowing' });
    }

    // Get the book title (real name)
    const [bookInfo] = await pool.execute(`
      SELECT Title
      FROM Book
      WHERE BookID = ?
    `, [id]);

    if (bookInfo.length === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }
    
    const bookTitle = bookInfo[0].Title;

    // Get an available copy
    const [copyRows] = await pool.execute(`
      SELECT CopyID
      FROM Book_Copy
      WHERE BookID = ? AND AvailabilityStatus = 'Available'
      LIMIT 1
    `, [id]);
    
    if (copyRows.length === 0) {
      return res.status(400).json({ success: false, message: 'No available copies found' });
    }
    
    const copyId = copyRows[0].CopyID;

    // 🔹 Generate LoanID (Starting from 151 and incrementing)
    const [loanCount] = await pool.execute(`SELECT COUNT(*) AS totalLoans FROM Loan`);
    const nextLoanId = 151 + loanCount[0].totalLoans;
    const loanId = `L${nextLoanId}`;

    // 🔹 Generate random StaffID between STF001 and STF020
    const randomStaffId = `STF${String(Math.floor(Math.random() * 20) + 1).padStart(3, '0')}`;

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Create loan record
      const loanDate = new Date().toISOString().slice(0, 10);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14); // 2 weeks loan period
      
      await connection.execute(`
        INSERT INTO Loan (LoanID, MemberID, IssuedBy, LoanDate, DueDate, Status)
        VALUES (?, ?, ?, ?, ?, 'Borrowed')
      `, [loanId, memberId, randomStaffId, loanDate, dueDate.toISOString().slice(0, 10)]);
      
      // Create loan details record
      await connection.execute(`
        INSERT INTO LOAN_DETAILS (LoanID, CopyID)
        VALUES (?, ?)
      `, [loanId, copyId]);
      
      // Update book copy status
      await connection.execute(`
        UPDATE Book_Copy
        SET AvailabilityStatus = 'On Loan'
        WHERE CopyID = ?
      `, [copyId]);
      
      await connection.commit();
      
      // Send response with book title, loan ID, and due date
      res.status(200).json({ 
        success: true,
        bookTitle, 
        loanId,  // Include the new Loan ID
        issuedBy: randomStaffId,  // Include randomly assigned staff
        dueDate: dueDate.toISOString().slice(0, 10)
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Borrow book error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Return book
app.post('/api/return-book/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params; // This is the loan ID
    const memberId = req.user.id;
    
    // Check if loan exists and belongs to the member
    const [loanRows] = await pool.execute(`
      SELECT l.*, ld.CopyID
      FROM Loan l
      JOIN LOAN_DETAILS ld ON l.LoanID = ld.LoanID
      WHERE l.LoanID = ? AND l.MemberID = ? AND l.Status = 'Borrowed'
    `, [id, memberId]);
    
    if (loanRows.length === 0) {
      return res.status(404).json({ message: 'Loan not found or already returned' });
    }
    
    const loan = loanRows[0];
    const copyId = loan.CopyID;
    const returnDate = new Date().toISOString().slice(0, 10);
    const dueDate = new Date(loan.DueDate);
    const today = new Date();
    
    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Update loan record
      await connection.execute(`
        UPDATE Loan
        SET ReturnDate = ?, Status = 'Returned', ReceivedBy = ?
        WHERE LoanID = ?
      `, [returnDate, 'STF001', id]);
      
      // Update book copy status
      await connection.execute(`
        UPDATE Book_Copy
        SET AvailabilityStatus = 'Available'
        WHERE CopyID = ?
      `, [copyId]);
      
      // Check if book is overdue and create fine if necessary
      if (today > dueDate) {
        const daysLate = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
        const fineAmount = daysLate * 0.50; // $0.50 per day late
        
        const fineId = `F${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        
        await connection.execute(`
          INSERT INTO Fine (FineID, LoanID, Amount, Status)
          VALUES (?, ?, ?, 'Unpaid')
        `, [fineId, id, fineAmount]);
        
        await connection.commit();
        
        res.status(200).json({ 
          message: 'Book returned successfully, but it was overdue',
          fine: {
            fineId,
            amount: fineAmount,
            daysLate
          }
        });
      } else {
        await connection.commit();
        
        res.status(200).json({ 
          message: 'Book returned successfully'
        });
      }
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Return book error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/submit-review/:id', authenticateToken, async (req, res) => {
  try {
    let { id } = req.params; // Book ID
    id = id.toUpperCase(); // Force conversion to uppercase at the start

    const memberId = req.user.id;
    const { rating, reviewText } = req.body;

    if (!rating || !reviewText) {
      return res.status(400).json({ message: 'Rating and review text are required' });
    }

    // Check if book exists (now using uppercase Book ID)
    const [bookRows] = await pool.execute(`SELECT 1 FROM Book WHERE BookID = ?`, [id]);
    if (bookRows.length === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get last RatingID and format it
      const [lastRating] = await connection.execute(`SELECT RatingID FROM Rating ORDER BY RatingID DESC LIMIT 1`);
      const nextRatingNum = lastRating.length > 0 ? parseInt(lastRating[0].RatingID.substring(1)) + 1 : 1;
      const nextRatingId = `R${nextRatingNum.toString().padStart(3, '0')}`;

      // Insert or update Rating
      await connection.execute(`
        INSERT INTO Rating (RatingID, BookID, MemberID, Score)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE Score = VALUES(Score)
      `, [nextRatingId, id, memberId, rating]);

      // Get last ReviewID and format it
      const [lastReview] = await connection.execute(`SELECT ReviewID FROM Review ORDER BY ReviewID DESC LIMIT 1`);
      const nextReviewNum = lastReview.length > 0 ? parseInt(lastReview[0].ReviewID.substring(3)) + 1 : 1;
      const nextReviewId = `REV${nextReviewNum.toString().padStart(3, '0')}`;

      // Insert or update Review
      await connection.execute(`
        INSERT INTO Review (ReviewID, BookID, MemberID, ReviewText)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE ReviewText = VALUES(ReviewText)
      `, [nextReviewId, id, memberId, reviewText]);

      await connection.commit();
      res.status(200).json({ message: 'Review submitted successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Routes

// Approve loan request
app.post('/api/approve-loan/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params; // Loan ID
    
    // Check if loan exists and is pending
    const [loanRows] = await pool.execute(`
      SELECT * FROM Loan WHERE LoanID = ? AND Status = 'Pending'
    `, [id]);
    
    if (loanRows.length === 0) {
      return res.status(404).json({ message: 'Loan request not found or already processed' });
    }
    
    // Update loan status
    await pool.execute(`
      UPDATE Loan
      SET Status = 'Borrowed', IssuedBy = ?
      WHERE LoanID = ?
    `, [req.user.id, id]);
    
    // Update book copy status
    const [loanDetailRows] = await pool.execute(`
      SELECT CopyID FROM LOAN_DETAILS WHERE LoanID = ?
    `, [id]);
    
    if (loanDetailRows.length > 0) {
      await pool.execute(`
        UPDATE Book_Copy
        SET AvailabilityStatus = 'On Loan'
        WHERE CopyID = ?
      `, [loanDetailRows[0].CopyID]);
    }
    
    res.status(200).json({ message: 'Loan request approved successfully' });
  } catch (error) {
    console.error('Approve loan error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject loan request
app.post('/api/reject-loan/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params; // Loan ID
    
    // Check if loan exists and is pending
    const [loanRows] = await pool.execute(`
      SELECT * FROM Loan WHERE LoanID = ? AND Status = 'Pending'
    `, [id]);
    
    if (loanRows.length === 0) {
      return res.status(404).json({ message: 'Loan request not found or already processed' });
    }
    
    // Update loan status
    await pool.execute(`
      UPDATE Loan
      SET Status = 'Rejected', IssuedBy = ?
      WHERE LoanID = ?
    `, [req.user.id, id]);
    
    res.status(200).json({ message: 'Loan request rejected successfully' });
  } catch (error) {
    console.error('Reject loan error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add Book Route
app.post('/api/manage-books', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
      const { title, author, publicationYear, language, pages, summary, publisher, genre, copies } = req.body;
      console.log("\ud83d\udce5 Received Data:", req.body);

      // Helper function to generate next ID
      async function getNextID(table, column, prefix, length) {
          let [result] = await pool.execute(`SELECT ${column} FROM ${table} ORDER BY ${column} DESC LIMIT 1`);
          if (result.length === 0) return `${prefix}${"1".padStart(length, "0")}`;
          let lastID = parseInt(result[0][column].replace(prefix, "")) + 1;
          return `${prefix}${lastID.toString().padStart(length, "0")}`;
      }

      // 1. Get or Insert Publisher
      let [publisherResult] = await pool.execute("SELECT PublisherID FROM Publisher WHERE Name = ?", [publisher]);
      let publisherID;
      if (publisherResult.length === 0) {
          publisherID = await getNextID("Publisher", "PublisherID", "PUB", 3);
          await pool.execute("INSERT INTO Publisher (PublisherID, Name) VALUES (?, ?)", [publisherID, publisher]);
          console.log(`✅ New Publisher Inserted: ${publisherID}`);
      } else {
          publisherID = publisherResult[0].PublisherID;
      }

      // 2. Get or Insert Author
      let [authorResult] = await pool.execute("SELECT AuthorID FROM Author WHERE CONCAT(FirstName, ' ', LastName) = ?", [author]);
      let authorID;
      if (authorResult.length === 0) {
          authorID = await getNextID("Author", "AuthorID", "A", 3);
          let [firstName, lastName] = author.split(" ");
          await pool.execute("INSERT INTO Author (AuthorID, FirstName, LastName) VALUES (?, ?, ?)", [authorID, firstName || "", lastName || ""]);
          console.log(`✅ New Author Inserted: ${authorID}`);
      } else {
          authorID = authorResult[0].AuthorID;
      }

      // 3. Get or Insert Genre
      let [genreResult] = await pool.execute("SELECT GenreID FROM Genre WHERE Name = ?", [genre]);
      let genreID;
      if (genreResult.length === 0) {
          genreID = await getNextID("Genre", "GenreID", "GEN", 3);
          await pool.execute("INSERT INTO Genre (GenreID, Name) VALUES (?, ?)", [genreID, genre]);
          console.log(`✅ New Genre Inserted: ${genreID}`);
      } else {
          genreID = genreResult[0].GenreID;
      }

      // 4. Insert into Book Table
      let bookID = await getNextID("Book", "BookID", "B", 3);
      await pool.execute(
          "INSERT INTO Book (BookID, Title, PublicationYear, Language, Pages, Summary, PublisherID) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [bookID, title, publicationYear, language, pages, summary, publisherID]
      );
      console.log(`✅ New Book Inserted: ${bookID}`);

      // 5. Insert into BOOK_AUTHOR Table
      await pool.execute("INSERT INTO BOOK_AUTHOR (BookID, AuthorID) VALUES (?, ?)", [bookID, authorID]);

      // 6. Insert into BOOK_GENRE Table
      await pool.execute("INSERT INTO BOOK_GENRE (BookID, GenreID) VALUES (?, ?)", [bookID, genreID]);

      // 7. Insert into Book_Copy Table
      for (let i = 0; i < copies; i++) {
          let copyID = await getNextID("Book_Copy", "CopyID", "CP", 3);
          let managedBy = `STF${(Math.floor(Math.random() * 20) + 1).toString().padStart(3, "0")}`;
          let acquisitionDate = new Date().toISOString().split("T")[0];
          let availabilityStatus = "Available";
          let location = "New Shelf";

          await pool.execute(
              "INSERT INTO Book_Copy (CopyID, BookID, ManagedBy, AcquisitionDate, ConditionOfBook, AvailabilityStatus, Location) VALUES (?, ?, ?, ?, ?, ?, ?)",
              [copyID, bookID, managedBy, acquisitionDate, "Good", availabilityStatus, location]
          );
      }
      console.log("✅ New Book Inserted:", bookID);


      res.status(201).json({ message: "Book added successfully! ", bookID: bookID });
  } catch (error) {
      console.error("❌ Database Error:", error);
      res.status(500).json({ message: "Database error. Check server logs." });
  }
});

// Manage books - Update
app.put('/api/manage-books/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, publicationYear, language, pages, 
      summary, publisher, genre 
    } = req.body;
    
    // Check if book exists
    const [bookRows] = await pool.execute(`
      SELECT * FROM Book WHERE BookID = ?
    `, [id]);
    
    if (bookRows.length === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Check if publisher exists
      let publisherId = bookRows[0].PublisherID;
      
      if (publisher) {
        const [publisherRows] = await connection.execute(`
          SELECT PublisherID FROM Publisher WHERE Name = ?
        `, [publisher]);
        
        if (publisherRows.length > 0) {
          publisherId = publisherRows[0].PublisherID;
        } else {
          // Create new publisher
          publisherId = `PUB${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
          await connection.execute(`
            INSERT INTO Publisher (PublisherID, Name)
            VALUES (?, ?)
          `, [publisherId, publisher]);
        }
      }
      
      // Update book
      await connection.execute(`
        UPDATE Book
        SET Title = COALESCE(?, Title),
            PublicationYear = COALESCE(?, PublicationYear),
            Language = COALESCE(?, Language),
            Pages = COALESCE(?, Pages),
            Summary = COALESCE(?, Summary),
            PublisherID = ?
        WHERE BookID = ?
      `, [title, publicationYear, language, pages, summary, publisherId, id]);
      
      // Update genre if provided
      if (genre) {
        // Check if genre exists
        let genreId;
        const [genreRows] = await connection.execute(`
          SELECT GenreID FROM Genre WHERE Name = ?
        `, [genre]);
        
        if (genreRows.length > 0) {
          genreId = genreRows[0].GenreID;
        } else {
          // Create new genre
          genreId = `GEN${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
          await connection.execute(`
            INSERT INTO Genre (GenreID, Name)
            VALUES (?, ?)
          `, [genreId, genre]);
        }
        
        // Remove existing genre associations
        await connection.execute(`
          DELETE FROM BOOK_GENRE WHERE BookID = ?
        `, [id]);
        
        // Add new genre association
        await connection.execute(`
          INSERT INTO BOOK_GENRE (BookID, GenreID)
          VALUES (?, ?)
        `, [id, genreId]);
      }
      
      await connection.commit();
      
      res.status(200).json({ 
        message: 'Book updated successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/delete-books/:id', authenticateToken, async (req, res) => {
  try {
      const { id } = req.params;  // ✅ Ensure this matches `:id` from route

      console.log("📤 Delete request received for BookID:", id);  // Debugging

      // Check if book exists
      const [bookCheck] = await pool.execute("SELECT * FROM Book WHERE BookID = ?", [id]);
      if (bookCheck.length === 0) {
          return res.status(404).json({ message: "⚠️ Book not found" });
      }

      // Delete book copies first (due to foreign key constraints)
      await pool.execute("DELETE FROM Book_Copy WHERE BookID = ?", [id]);

      // Delete from BOOK_AUTHOR, BOOK_GENRE, and other relations
      await pool.execute("DELETE FROM BOOK_AUTHOR WHERE BookID = ?", [id]);
      await pool.execute("DELETE FROM BOOK_GENRE WHERE BookID = ?", [id]);

      // Finally, delete the book
      await pool.execute("DELETE FROM Book WHERE BookID = ?", [id]);

      res.json({ success: true, message: "✅ Book deleted successfully!" });
  } catch (error) {
      console.error("❌ Error deleting book:", error);
      res.status(500).json({ message: "Database error. Check server logs." });
  }
});

app.get("/api/members/:id", async (req, res) => {
  try {
      const memberID = req.params.id;
      const sql = "SELECT * FROM `Member` WHERE MemberID = ?";
      const [rows] = await pool.query(sql, [memberID]);

      if (rows.length > 0) {
          res.json(rows[0]); // Return the first member
      } else {
          res.status(404).json({ error: "Member not found" });
      }
  } catch (error) {
      console.error("❌ Error fetching member details:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// View members
app.get("/api/members", async (req, res) => {
  try {
      let { page, limit, search } = req.query;
      page = parseInt(page) || 1; // Default to page 1
      limit = parseInt(limit) || 10; // Default 10 members per page
      const offset = (page - 1) * limit;

      let sql = "SELECT * FROM `Member`";
      let countSql = "SELECT COUNT(*) AS total FROM `Member`";
      let params = [];

      if (search) {
          sql += " WHERE MemberID LIKE ? OR FirstName LIKE ? OR LastName LIKE ? OR Email LIKE ?";
          countSql += " WHERE MemberID LIKE ? OR FirstName LIKE ? OR LastName LIKE ? OR Email LIKE ?";
          const searchPattern = `%${search}%`;
          params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      sql += " LIMIT ? OFFSET ?";
      params.push(limit, offset);

      const [members] = await pool.query(sql, params);
      const [[{ total }]] = await pool.query(countSql, params.slice(0, -2)); // Exclude LIMIT & OFFSET

      res.json({
          members,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
      });
  } catch (error) {
      console.error("❌ Error fetching members:", error);
      res.status(500).json({ error: "Internal Server Error." });
  }
});

//Add Member Route
app.post("/api/members-add", async (req, res) => {
  try {
      const { firstName, lastName, email, phone, address, membershipType } = req.body;

      if (!firstName || !lastName || !email || !phone || !address || !membershipType) {
          return res.status(400).json({ error: "All fields are required." });
      }

      // Generate new MemberID (e.g., "M005")
      const [result] = await pool.query("SELECT MAX(MemberID) AS lastID FROM `Member`");
      let newID = "M001"; // Default for first entry
      if (result[0].lastID) {
          let lastNum = parseInt(result[0].lastID.substring(1)) + 1;
          newID = `M${String(lastNum).padStart(3, "0")}`;
      }

      const sql = "INSERT INTO `Member` (MemberID, FirstName, LastName, Email, Phone, Address, MembershipType, MembershipDate) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";
      const [insertResult] = await pool.query(sql, [newID, firstName, lastName, email, phone, address, membershipType]);

      console.log("✅ Insert Result:", insertResult); // ✅ Debug log

      res.json({ message: "Member added successfully", memberID: newID });
  } catch (error) {
      console.error("❌ Error adding member:", error);
      res.status(500).json({ error: "Internal Server Error." });
  }
});

//Delete Member Route
app.delete("/api/members-delete/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Member ID is required." });

  try {
      const [result] = await pool.query("DELETE FROM `Member` WHERE MemberID = ?", [id]);

      if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Member not found." });
      }

      res.json({ success: true, message: "Member deleted successfully!" });
  } catch (error) {
      console.error("❌ Error deleting member:", error);
      res.status(500).json({ error: "Internal Server Error." });
  }
});

//Edit Member Route
app.put("/api/members-update/:id", async (req, res) => {
  try {
      const memberID = req.params.id;
      const { firstName, lastName, email, phone, address, membershipType } = req.body;

      const sql = "UPDATE `Member` SET FirstName=?, LastName=?, Email=?, Phone=?, Address=?, MembershipType=? WHERE MemberID=?";
      const [result] = await pool.query(sql, [firstName, lastName, email, phone, address, membershipType, memberID]);

      if (result.affectedRows > 0) {
          res.json({ success: true, message: "Member updated successfully!" });
      } else {
          res.status(404).json({ error: "Member not found." });
      }
  } catch (error) {
      console.error("❌ Error updating member:", error);
      res.status(500).json({ error: "Internal Server Error." });
  }
});


// Mark loan as returned and make the book copy available again
app.put("/api/loans/:id/return", async (req, res) => {
  const loanId = req.params.id;

  try {
    // Step 1: Update the Loan status and ReturnDate
    await pool.execute(
      `UPDATE Loan SET Status = 'Returned', ReturnDate = CURDATE() WHERE LoanID = ?`,
      [loanId]
    );

    // Step 2: Get associated CopyID from Loan_Details
    const [loanDetails] = await pool.execute(
      `SELECT CopyID FROM LOAN_DETAILS WHERE LoanID = ?`,
      [loanId]
    );

    if (loanDetails.length > 0) {
      const copyId = loanDetails[0].CopyID;

      // Step 3: Update the AvailabilityStatus in Book_Copy to 'Available'
      await pool.execute(
        `UPDATE Book_Copy SET AvailabilityStatus = 'Available' WHERE CopyID = ?`,
        [copyId]
      );
    }

    res.json({ message: "Loan marked as returned and book made available." });
  } catch (error) {
    console.error("Error updating loan status:", error);
    res.status(500).json({ error: "Failed to update loan status" });
  }
});

// Load all interlibrary loan requests for Admin Dashboard
app.get('/api/interlibrary-loans', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        i.InterlibraryLoanID AS id,
        b.Title AS title,
        CONCAT(a.FirstName, ' ', a.LastName) AS author,
        CONCAT(m.FirstName, ' ', m.LastName) AS member,
        i.LibraryName AS library,
        i.LoanDate AS requestDate
      FROM Interlibrary_Loan i
      JOIN Book b ON i.BookID = b.BookID
      JOIN Member m ON i.MemberID = m.MemberID
      JOIN BOOK_AUTHOR ba ON b.BookID = ba.BookID
      JOIN Author a ON ba.AuthorID = a.AuthorID
    `);
  
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error loading interlibrary table:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete("/api/interlibrary-loans/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.execute("DELETE FROM Interlibrary_Loan WHERE InterlibraryLoanID = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Loan not found" });
    }

    res.json({ message: "Loan deleted successfully" });
  } catch (error) {
    console.error("Error deleting interlibrary loan:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Interlibrary loan routes
app.post('/api/interlibrary-loan', authenticateToken, async (req, res) => {
  try {
    const memberId = req.user.id;
    const { bookId, library } = req.body;  // Accept bookId and library
    
    // Validate that bookId and library are provided
    if (!bookId || !library) {
      return res.status(400).json({ message: 'Book ID and library are required' });
    }

    // Get the most recent InterlibraryLoanID from the database
    const [rows] = await pool.execute(`
      SELECT InterlibraryLoanID 
      FROM Interlibrary_Loan 
      ORDER BY InterlibraryLoanID DESC 
      LIMIT 1
    `);

    // Generate the next InterlibraryLoanID based on the most recent one
    let interlibraryLoanId;
    if (rows.length > 0) {
      const lastLoanId = rows[0].InterlibraryLoanID;
      const numericPart = parseInt(lastLoanId.slice(3)); // Remove the "ILL" part
      const newNumericPart = numericPart + 1;
      interlibraryLoanId = `ILL${newNumericPart.toString().padStart(3, '0')}`;
    } else {
      // If no records exist, start with "ILL001"
      interlibraryLoanId = 'ILL001';
    }

    // Get current date for loan request date
    const requestDate = new Date().toISOString().slice(0, 10);
    
    // Insert the new interlibrary loan request into the database
    await pool.execute(`
      INSERT INTO Interlibrary_Loan (InterlibraryLoanID, MemberID, BookID, LibraryName, LoanDate)
      VALUES (?, ?, ?, ?, ?)
    `, [interlibraryLoanId, memberId, bookId, library, requestDate]);
    
    // Respond with success message and the generated InterlibraryLoanID
    res.status(201).json({ 
      message: `Your interlibrary loan request has been submitted. Request ID: ${interlibraryLoanId}`,
      interlibraryLoanId
    });
  } catch (error) {
    console.error('Interlibrary loan error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

//Show loan history interlibrary
app.get('/api/interlibrary-loan/:id', authenticateToken, async (req, res) => {
  const memberId = req.params.id; // Get member ID from request params
  try {
    const [rows] = await pool.execute(`
      SELECT 
        InterlibraryLoanID, 
        Interlibrary_Loan.BookID, 
        LoanDate, 
        LibraryName, 
        Book.Title AS BookTitle
      FROM 
        Interlibrary_Loan
      JOIN 
        Book ON Interlibrary_Loan.BookID = Book.BookID
      WHERE 
        MemberID = ?
    `, [memberId]);

    if (rows.length === 0) {
      return res.status(200).json({ message: "No interlibrary loan requests found" });
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error('Get interlibrary loans error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put("/api/edit-book/:bookID", authenticateToken, async (req, res) => {
  try {
      const { bookID } = req.params;
      const { title, author, publisher, genre, publicationYear, pages, summary } = req.body;

      // Check if book exists
      const [bookCheck] = await pool.execute("SELECT * FROM Book WHERE BookID = ?", [bookID]);
      if (bookCheck.length === 0) {
          return res.status(404).json({ message: "Book not found" });
      }

      // Update Book table
      await pool.execute(
          "UPDATE Book SET Title = ?, PublicationYear = ?, Pages = ?, Summary = ? WHERE BookID = ?",
          [title, publicationYear, pages, summary, bookID]
      );

      // Update Publisher if provided
      if (publisher) {
          await pool.execute(
              "UPDATE Publisher SET Name = ? WHERE PublisherID = (SELECT PublisherID FROM Book WHERE BookID = ?)", 
              [publisher, bookID]
          );
      }

      // ✅ **Split author into FirstName and LastName**
      if (author) {
          const authorParts = author.trim().split(" ");
          const firstName = authorParts[0];
          const lastName = authorParts.length > 1 ? authorParts.slice(1).join(" ") : "";

          await pool.execute(
              "UPDATE Author SET FirstName = ?, LastName = ? WHERE AuthorID = (SELECT AuthorID FROM BOOK_AUTHOR WHERE BookID = ?)", 
              [firstName, lastName, bookID]
          );
      }

      // Update Genre if provided
      if (genre) {
          await pool.execute(
              "UPDATE Genre SET Name = ? WHERE GenreID = (SELECT GenreID FROM BOOK_GENRE WHERE BookID = ?)", 
              [genre, bookID]
          );
      }

      res.json({ success: true, message: "Book updated successfully!" });
  } catch (error) {
      console.error("❌ Error updating book:", error);
      res.status(500).json({ message: "Database error. Check server logs." });
  }
});

// ✅ Catch-all route for undefined paths (prevents 404 errors)
app.get("*", (req, res) => {
  res.status(404).send("Page Not Found");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;