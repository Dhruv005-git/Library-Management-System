import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required' });
    }
    
    let table, query;
    
    if (role === 'admin') {
      table = 'Staff';
      query = 'SELECT * FROM Staff WHERE Email = ?';
    } else {
      table = 'Member';
      query = 'SELECT * FROM Member WHERE Email = ?';
    }
    
    const [rows] = await pool.execute(query, [email]);
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const user = rows[0];
    
    // For simplicity, we're using hardcoded passwords as specified in requirements
    // In a real application, you would use bcrypt.compare()
    let isValidPassword = false;
    
    if (role === 'admin' && password === 'admin1234') {
      isValidPassword = true;
    } else if (role === 'user' && password === '1234') {
      isValidPassword = true;
    }
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Create and assign token
    const token = jwt.sign(
      { 
        id: user[`${table}ID`], 
        email: user.Email, 
        role: role,
        name: `${user.FirstName} ${user.LastName}`
      }, 
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.status(200).json({ 
      token,
      user: {
        id: user[`${table}ID`],
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

export default router;