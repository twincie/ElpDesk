import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DatabaseManager } from '../database/index.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = (req as any).db as DatabaseManager;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const hashPassword = user.passwordhash;
    if (!hashPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, hashPassword);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    const { passwordhash, ...userWithoutPassword } = user;
    
    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, organizationName, contactEmail } = req.body;
    const db = (req as any).db as DatabaseManager;

    if (!email || !password || !organizationName || !contactEmail) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create organization first
    const organization = await db.createOrganization(organizationName, contactEmail);

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.createUser(email, passwordHash, 'ORG_USER', organization.id);

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { passwordhash: _, ...userWithoutPassword } = user;

    res.status(201).json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/admin/register', async (req, res) => {
  try {
    const { email, password, adminKey } = req.body;
    const db = (req as any).db as DatabaseManager;

    // Simple admin key check (in production, use a more secure method)
    if (adminKey !== process.env.ADMIN_REGISTRATION_KEY && adminKey !== 'admin-secret-key') {
      return res.status(403).json({ error: 'Invalid admin registration key' });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password and create admin user
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.createUser(email, passwordHash, 'ADMIN');

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { passwordhash: _, ...userWithoutPassword } = user;

    res.status(201).json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as authRoutes };