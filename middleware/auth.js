// import jwt from 'jsonwebtoken';

// const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// export const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1];
  
//   if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });
  
//   try {
//     const verified = jwt.verify(token, JWT_SECRET);
//     req.user = verified;
//     next();
//   } catch (error) {
//     res.status(400).json({ message: 'Invalid token' });
//   }
// };

// export const authorizeRole = (roles) => {
//   return (req, res, next) => {
//     if (!roles.includes(req.user.role)) {
//       return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
//     }
//     next();
//   };
// };