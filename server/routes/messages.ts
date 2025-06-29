import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { DatabaseManager } from '../database/index.js';

const router = Router();

router.use(authenticateToken);

router.post('/', async (req, res) => {
  try {
    const { content, ticketId } = req.body;
    const user = (req as any).user;
    const db = (req as any).db as DatabaseManager;

    if (!content || !ticketId) {
      return res.status(400).json({ error: 'Content and ticketId are required' });
    }

    // Check if user has access to this ticket
    const ticket = await db.getTicketById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (user.role !== 'ADMIN' && ticket.userId !== user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const message = db.createMessage(content, ticketId, user.userId);
    res.status(201).json(message);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ticket/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    // const user = (req as any).user;
    const db = (req as any).db as DatabaseManager;

    // Check if user has access to this ticket
    const ticket = await db.getTicketById(parseInt(ticketId));
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // if (user.role !== 'ADMIN' && ticket.userId !== user.userId) {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    const messages = await db.getMessagesWithUserInfo(parseInt(ticketId));
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as messageRoutes };