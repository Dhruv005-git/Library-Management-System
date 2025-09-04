import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Search books
router.get('/search-books', async (req, res) => {
  try {
    const { query, filter } = req.query;
    
    let sqlQuery = `
      SELECT b.*, a.FirstName AS AuthorFirstName, a.LastName AS AuthorLastName, 
             p.Name AS PublisherName, g.Name AS GenreName
      FROM Book b
      LEFT JOIN BOOK_AUTHOR ba ON b.BookID = ba.BookID
      LEFT JOIN Author a ON ba.AuthorID = a.AuthorID
      LEFT JOIN Publisher p ON b.PublisherID = p.PublisherID
      LEFT JOIN BOOK_GENRE bg ON b.BookID = bg.BookID
      LEFT JOIN Genre g ON bg.GenreID = g.GenreID
      WHERE 1=1
    `;
    
    const params = [];
    
    if (query) {
      sqlQuery += ` AND (b.Title LIKE ? OR a.FirstName LIKE ? OR a.LastName LIKE ? OR b.Summary LIKE ?)`;
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (filter && filter !== 'all') {
      sqlQuery += ` AND g.Name = ?`;
      params.push(filter);
    }
    
    sqlQuery += ` GROUP BY b.BookID`;
    
    const [rows] = await pool.execute(sqlQuery, params);
    
    res.status(200).json(rows);
  } catch (error) {
    console.error('Search books error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get book details
router.get('/view-book/:id', async (req, res) => {
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

// Borrow book
router.post('/borrow-book/:id', authenticateToken, async (req, res) => {
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
      return res.status(400).json({ message: 'Book is not available for borrowing' });
    }
    
    // Get an available copy
    const [copyRows] = await pool.execute(`
      SELECT CopyID
      FROM Book_Copy
      WHERE BookID = ? AND AvailabilityStatus = 'Available'
      LIMIT 1
    `, [id]);
    
    if (copyRows.length === 0) {
      return res.status(400).json({ message: 'No available copies found' });
    }
    
    const copyId = copyRows[0].CopyID;
    
    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Create loan record
      const loanId = `L${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      const staffId = 'STF001'; // Default staff ID for now
      const loanDate = new Date().toISOString().slice(0, 10);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14); // 2 weeks loan period
      
      await connection.execute(`
        INSERT INTO Loan (LoanID, MemberID, IssuedBy, LoanDate, DueDate, Status)
        VALUES (?, ?, ?, ?, ?, 'Borrowed')
      `, [loanId, memberId, staffId, loanDate, dueDate.toISOString().slice(0, 10)]);
      
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
      
      res.status(200).json({ 
        message: 'Book borrowed successfully',
        loanId,
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
    res.status(500).json({ message: 'Server error' });
  }
});

// Return book
router.post('/return-book/:id', authenticateToken, async (req, res) => {
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

// Admin routes for managing books
router.post('/manage-books', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { 
      title, author, publicationYear, language, pages, 
      summary, publisher, genre, copies 
    } = req.body;
    
    if (!title || !author || !publicationYear || !publisher || !genre) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }
    
    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Check if publisher exists
      let publisherId;
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
      
      // Create book
      const bookId = `B${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      await connection.execute(`
        INSERT INTO Book (BookID, Title, PublicationYear, Language, Pages, Summary, PublisherID)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [bookId, title, publicationYear, language, pages, summary, publisherId]);
      
      // Check if author exists
      let authorId;
      const authorNames = author.split(' ');
      const firstName = authorNames[0];
      const lastName = authorNames.slice(1).join(' ');
      
      const [authorRows] = await connection.execute(`
        SELECT AuthorID FROM Author WHERE FirstName = ? AND LastName = ?
      `, [firstName, lastName]);
      
      if (authorRows.length > 0) {
        authorId = authorRows[0].AuthorID;
      } else {
        // Create new author
        authorId = `A${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        await connection.execute(`
          INSERT INTO Author (AuthorID, FirstName, LastName)
          VALUES (?, ?, ?)
        `, [authorId, firstName, lastName]);
      }
      
      // Link book and author
      await connection.execute(`
        INSERT INTO BOOK_AUTHOR (BookID, AuthorID)
        VALUES (?, ?)
      `, [bookId, authorId]);
      
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
      
      // Link book and genre
      await connection.execute(`
        INSERT INTO BOOK_GENRE (BookID, GenreID)
        VALUES (?, ?)
      `, [bookId, genreId]);
      
      // Create book copies
      const numCopies = copies || 1;
      for (let i = 0; i < numCopies; i++) {
        const copyId = `CP${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        await connection.execute(`
          INSERT INTO Book_Copy (CopyID, BookID, ManagedBy, AcquisitionDate, ConditionOfBook, AvailabilityStatus, Location)
          VALUES (?, ?, ?, CURDATE(), 'New', 'Available', 'Shelf A1')
        `, [copyId, bookId, req.user.id]);
      }
      
      await connection.commit();
      
      res.status(201).json({ 
        message: 'Book added successfully',
        bookId
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Add book error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;