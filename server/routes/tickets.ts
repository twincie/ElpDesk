import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { DatabaseManager } from '../database/index.js';

const router = Router();

router.use(authenticateToken);

router.post('/', (req, res) => {
  try {
    const { title, description, priority } = req.body;
    const user = (req as any).user;
    const db = (req as any).db as DatabaseManager;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const ticket = db.createTicket({
      title,
      description,
      priority: priority || 'MEDIUM',
      userId: user.userId,
      orgId: user.role === 'ORG_USER' ? user.orgId : undefined
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const db = (req as any).db as DatabaseManager;
    const { status, priority } = req.query;

    let tickets;

    if (user.role === 'ADMIN') {
      // Admins can see all tickets with filters
      tickets = await db.getAllTicketsWithInfo({
        status: status as string,
        priority: priority as string
      });
    } else {
      // Regular users can only see their own tickets
      const userTickets = await db.getTicketsByUserId(user.userId);
      tickets = await Promise.all(
        userTickets.map(async ticket => {
          const ticketWithInfo = await db.getTicketWithUserInfo(ticket.id);
          return ticketWithInfo;
        })
      );

      // Apply filters for user tickets
      if (status) {
        tickets = tickets.filter(ticket => ticket.status === status);
      }
      if (priority) {
        tickets = tickets.filter(ticket => ticket.priority === priority);
      }
    }

    res.json(tickets || []);
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // const user = (req as any).user;
    const db = (req as any).db as DatabaseManager;

    const ticket = await db.getTicketWithUserInfo(parseInt(id));
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check permissions
    // if (user.role !== 'ADMIN' && ticket.userId !== user.userId) {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    res.json(ticket);
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = (req as any).user;
    const db = (req as any).db as DatabaseManager;

    // Only admins can update ticket status
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const ticket = db.getTicketById(parseInt(id));
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    db.updateTicketStatus(parseInt(id), status, user.userId);
    
    const updatedTicket = db.getTicketWithUserInfo(parseInt(id));
    res.json(updatedTicket);
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as ticketRoutes };