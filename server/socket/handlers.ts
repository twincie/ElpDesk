import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { DatabaseManager } from '../database/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const setupSocketHandlers = (io: Server, db: DatabaseManager) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    console.log(`User ${user.email} connected`);

    // Join user to their own room for personal notifications
    socket.join(`user:${user.userId}`);

    // Join ticket rooms when user enters ticket view
    socket.on('join-ticket', async (ticketId: number) => {
      // Verify user has access to this ticket
      const ticket = await db.getTicketById(ticketId);
      if (ticket && (user.role === 'ADMIN' || ticket.userId === user.userId)) {
        socket.join(`ticket:${ticketId}`);
        console.log(`User ${user.email} joined ticket ${ticketId}`);
      }
    });

    socket.on('leave-ticket', (ticketId: number) => {
      socket.leave(`ticket:${ticketId}`);
      console.log(`User ${user.email} left ticket ${ticketId}`);
    });

    // Handle new messages
    socket.on('send-message', async (data: { content: string; ticketId: number }) => {
      try {
        const { content, ticketId } = data;
        
        // Verify user has access to this ticket
        const ticket = await db.getTicketById(ticketId);
        if (!ticket || (user.role !== 'ADMIN' && ticket.userId !== user.userid)) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Create message in database
        const message = await db.createMessage(content, ticketId, user.userId);
        
        // Get message with user info
        const messagesWithUser = await db.getMessagesWithUserInfo(ticketId);
        const messageWithUser = messagesWithUser.find(m => m.id === message.id);

        // Broadcast to all users in the ticket room
        io.to(`ticket:${ticketId}`).emit('new-message', messageWithUser);

        // If message is from org user, notify all admins
        if (user.role === 'ORG_USER') {
          socket.broadcast.emit('new-ticket-message', {
            ticketId,
            ticketTitle: ticket.title,
            message: messageWithUser
          });
        }

        console.log(`Message sent in ticket ${ticketId} by ${user.email}`);
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle ticket status updates
    socket.on('update-ticket-status', async (data: { ticketId: number; status: string }) => {
      try {
        const { ticketId, status } = data;

        // Only admins can update status
        if (user.role !== 'ADMIN') {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
        if (!validStatuses.includes(status)) {
          socket.emit('error', { message: 'Invalid status' });
          return;
        }

        const ticket = await db.getTicketById(ticketId);
        if (!ticket) {
          socket.emit('error', { message: 'Ticket not found' });
          return;
        }

        await db.updateTicketStatus(ticketId, status, user.userId);
        const updatedTicket = await db.getTicketWithUserInfo(ticketId);

        // Broadcast to all users in the ticket room
        io.to(`ticket:${ticketId}`).emit('ticket-status-updated', updatedTicket);

        // Notify the ticket owner
        io.to(`user:${ticket.userId}`).emit('ticket-status-notification', {
          ticketId,
          ticketTitle: ticket.title,
          newStatus: status,
          updatedBy: user.email
        });

        console.log(`Ticket ${ticketId} status updated to ${status} by ${user.email}`);
      } catch (error) {
        console.error('Update ticket status error:', error);
        socket.emit('error', { message: 'Failed to update ticket status' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User ${user.email} disconnected`);
    });
  });
};