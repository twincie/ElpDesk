import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

interface Notification {
  id: string;
  type: 'ticket_update' | 'new_message' | 'ticket_assigned' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  ticketId?: number;
  priority?: 'low' | 'medium' | 'high';
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (socket && user) {
      // Listen for real-time notifications
      socket.on('ticket-status-notification', (data) => {
        addNotification({
          type: 'ticket_update',
          title: 'Ticket Status Updated',
          message: `Ticket "${data.ticketTitle}" status changed to ${data.newStatus}`,
          ticketId: data.ticketId,
          priority: 'medium'
        });
      });

      socket.on('new-ticket-message', (data) => {
        addNotification({
          type: 'new_message',
          title: 'New Message',
          message: `New message in ticket: ${data.ticketTitle}`,
          ticketId: data.ticketId,
          priority: 'high'
        });
      });

      socket.on('ticket-assigned', (data) => {
        addNotification({
          type: 'ticket_assigned',
          title: 'Ticket Assigned',
          message: `You have been assigned to ticket: ${data.ticketTitle}`,
          ticketId: data.ticketId,
          priority: 'medium'
        });
      });

      socket.on('system-notification', (data) => {
        addNotification({
          type: 'system',
          title: data.title,
          message: data.message,
          priority: data.priority || 'low'
        });
      });

      return () => {
        socket.off('ticket-status-notification');
        socket.off('new-ticket-message');
        socket.off('ticket-assigned');
        socket.off('system-notification');
      };
    }
  }, [socket, user]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const addNotification = (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const notification: Notification = {
      ...notificationData,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [notification, ...prev]);

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      });
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};