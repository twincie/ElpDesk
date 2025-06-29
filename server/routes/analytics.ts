// import { Router } from 'express';
// import { authenticateToken } from '../middleware/auth.js';
// import { DatabaseManager } from '../database/index.js';

// const router = Router();

// router.use(authenticateToken);

// // Get analytics data (admin only)
// router.get('/', (req, res) => {
//   try {
//     const user = (req as any).user;
//     const db = (req as any).db as DatabaseManager;

//     if (user.role !== 'ADMIN') {
//       return res.status(403).json({ error: 'Access denied' });
//     }

//     const { range = '30d' } = req.query;

//     // Calculate date range
//     const now = new Date();
//     let startDate = new Date();
    
//     switch (range) {
//       case '7d':
//         startDate.setDate(now.getDate() - 7);
//         break;
//       case '30d':
//         startDate.setDate(now.getDate() - 30);
//         break;
//       case '90d':
//         startDate.setDate(now.getDate() - 90);
//         break;
//       case '1y':
//         startDate.setFullYear(now.getFullYear() - 1);
//         break;
//       default:
//         startDate.setDate(now.getDate() - 30);
//     }

//     // Get basic ticket statistics
//     const totalTickets = db.db.prepare('SELECT COUNT(*) as count FROM tickets').get() as { count: number };
//     const openTickets = db.db.prepare('SELECT COUNT(*) as count FROM tickets WHERE status = ?').get('OPEN') as { count: number };
//     const inProgressTickets = db.db.prepare('SELECT COUNT(*) as count FROM tickets WHERE status = ?').get('IN_PROGRESS') as { count: number };
//     const resolvedTickets = db.db.prepare('SELECT COUNT(*) as count FROM tickets WHERE status = ?').get('RESOLVED') as { count: number };

//     // Get tickets by priority
//     const priorityStats = db.db.prepare(`
//       SELECT priority, COUNT(*) as count 
//       FROM tickets 
//       WHERE createdAt >= ? 
//       GROUP BY priority
//     `).all(startDate.toISOString());

//     const ticketsByPriority = {
//       HIGH: 0,
//       MEDIUM: 0,
//       LOW: 0
//     };

//     priorityStats.forEach((stat: any) => {
//       ticketsByPriority[stat.priority as keyof typeof ticketsByPriority] = stat.count;
//     });

//     // Get monthly ticket data (simplified for demo)
//     const ticketsByMonth = [
//       { month: 'Jan', count: 12 },
//       { month: 'Feb', count: 19 },
//       { month: 'Mar', count: 15 },
//       { month: 'Apr', count: 22 },
//       { month: 'May', count: 28 },
//       { month: 'Jun', count: 31 }
//     ];

//     // Get top organizations
//     const topOrganizations = db.db.prepare(`
//       SELECT o.name, COUNT(t.id) as ticketCount
//       FROM organizations o
//       LEFT JOIN tickets t ON o.id = t.orgId
//       WHERE t.createdAt >= ?
//       GROUP BY o.id, o.name
//       ORDER BY ticketCount DESC
//       LIMIT 5
//     `).all(startDate.toISOString());

//     // Calculate average resolution time (simplified)
//     const avgResolutionTime = 2.5; // days

//     const analytics = {
//       totalTickets: totalTickets.count,
//       openTickets: openTickets.count,
//       inProgressTickets: inProgressTickets.count,
//       resolvedTickets: resolvedTickets.count,
//       avgResolutionTime,
//       ticketsByPriority,
//       ticketsByMonth,
//       topOrganizations,
//       resolutionTrend: [
//         { date: '2024-01-01', resolved: 8, created: 12 },
//         { date: '2024-01-02', resolved: 15, created: 10 },
//         { date: '2024-01-03', resolved: 12, created: 8 },
//         { date: '2024-01-04', resolved: 18, created: 14 },
//         { date: '2024-01-05', resolved: 22, created: 16 }
//       ]
//     };

//     res.json(analytics);
//   } catch (error) {
//     console.error('Get analytics error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// export { router as analyticsRoutes };

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { DatabaseManager } from '../database/index.js';

const router = Router();

router.use(authenticateToken);

// Get analytics data (admin only)
router.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const db = (req as any).db as DatabaseManager;

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { range = '30d' } = req.query;
    const analytics = await db.getAnalyticsData(range as string);
    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as analyticsRoutes };