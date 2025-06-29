// import { Router } from 'express';
// import { authenticateToken } from '../middleware/auth.js';
// import { DatabaseManager } from '../database/index.js';

// const router = Router();

// router.use(authenticateToken);

// // Get all users (admin only)
// router.get('/', (req, res) => {
//   try {
//     const user = (req as any).user;
//     const db = (req as any).db as DatabaseManager;

//     if (user.role !== 'ADMIN') {
//       return res.status(403).json({ error: 'Access denied' });
//     }

//     // Get all users with organization info and ticket counts
//     const users = db.db.prepare(`
//       SELECT 
//         u.*,
//         o.name as organizationName,
//         COUNT(t.id) as ticketCount
//       FROM users u
//       LEFT JOIN organizations o ON u.orgId = o.id
//       LEFT JOIN tickets t ON u.id = t.userId
//       GROUP BY u.id
//       ORDER BY u.createdAt DESC
//     `).all();

//     // Remove password hashes from response
//     const sanitizedUsers = users.map((user: any) => {
//       const { passwordHash, ...userWithoutPassword } = user;
//       return userWithoutPassword;
//     });

//     res.json(sanitizedUsers);
//   } catch (error) {
//     console.error('Get users error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // Get user settings
// router.get('/settings', (req, res) => {
//   try {
//     const user = (req as any).user;
    
//     // Return default settings (in a real app, these would be stored in the database)
//     const settings = {
//       emailNotifications: true,
//       pushNotifications: true,
//       weeklyDigest: false,
//       ticketUpdates: true,
//       newMessages: true,
//       theme: 'system',
//       language: 'en',
//       timezone: 'UTC'
//     };

//     res.json(settings);
//   } catch (error) {
//     console.error('Get settings error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // Update user settings
// router.put('/settings', (req, res) => {
//   try {
//     const user = (req as any).user;
//     const settings = req.body;

//     // In a real app, save settings to database
//     // For now, just return success
//     res.json({ message: 'Settings updated successfully' });
//   } catch (error) {
//     console.error('Update settings error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // Update user password
// router.put('/password', async (req, res) => {
//   try {
//     const user = (req as any).user;
//     const { currentPassword, newPassword } = req.body;
//     const db = (req as any).db as DatabaseManager;

//     if (!currentPassword || !newPassword) {
//       return res.status(400).json({ error: 'Current password and new password are required' });
//     }

//     // Get user from database
//     const dbUser = db.getUserById(user.userId);
//     if (!dbUser) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     // Verify current password
//     const bcrypt = await import('bcryptjs');
//     const isValidPassword = await bcrypt.compare(currentPassword, dbUser.passwordHash);
//     if (!isValidPassword) {
//       return res.status(400).json({ error: 'Current password is incorrect' });
//     }

//     // Hash new password
//     const newPasswordHash = await bcrypt.hash(newPassword, 12);

//     // Update password in database
//     db.db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?')
//       .run(newPasswordHash, user.userId);

//     res.json({ message: 'Password updated successfully' });
//   } catch (error) {
//     console.error('Update password error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// export { router as userRoutes };

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { DatabaseManager } from '../database/index.js';

const router = Router();

router.use(authenticateToken);

// Get all users (admin only)
router.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const db = (req as any).db as DatabaseManager;

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const users = await db.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user settings
router.get('/settings', async (req, res) => {
  try {
    const user = (req as any).user;
    const db = (req as any).db as DatabaseManager;
    
    const settings = await db.getUserSettings(user.userId);
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user settings
router.put('/settings', async (req, res) => {
  try {
    const user = (req as any).user;
    const db = (req as any).db as DatabaseManager;
    const settings = req.body;

    await db.updateUserSettings(user.userId, settings);
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user password
router.put('/password', async (req, res) => {
  try {
    const user = (req as any).user;
    const { currentPassword, newPassword } = req.body;
    const db = (req as any).db as DatabaseManager;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Get user from database
    const dbUser = await db.getUserById(user.userId);
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const bcrypt = await import('bcryptjs');
    const isValidPassword = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password in database
    await db.updateUserPassword(user.userId, newPasswordHash);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as userRoutes };