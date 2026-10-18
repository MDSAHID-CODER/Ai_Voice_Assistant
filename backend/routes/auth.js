const express = require('express');
const router = express.Router();
const prisma = require('../db');

// Simple seed check + login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Check if any user exists, if not, seed admin
    let user = await prisma.user.findUnique({ where: { email } });
    
    const userCount = await prisma.user.count();
    if (userCount === 0 && email === 'admin@calling.ai' && password === 'admin123') {
      user = await prisma.user.create({
        data: {
          email: 'admin@calling.ai',
          password: 'admin123'
        }
      });
    }

    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Return simple session token (in production, use JWT or sessions)
    res.json({
      token: `token_${user.id}_mock`,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer token_')) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = authHeader.replace('Bearer token_', '').replace('_mock', '');

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    res.json({
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
