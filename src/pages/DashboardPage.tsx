import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { Link } from 'react-router-dom';
import { 
  Ticket, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Plus,
  TrendingUp,
  Users,
  MessageCircle
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  recentTickets?: any[];
}

export const DashboardPage: React.FC = () => {
  const { user , logout} = useAuth();
  const { showToast } = useToast();
  const { socket, connected } = useSocket();
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    recentTickets: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('ticket-status-notification', () => {
        // Refresh dashboard when ticket status changes
        fetchDashboardData();
      });

      socket.on('new-ticket-message', (data) => {
        // Could show notification or update counts
        console.log('New ticket message:', data);
      });

      return () => {
        socket.off('ticket-status-notification');
        socket.off('new-ticket-message');
      };
    }
  }, [socket]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tickets', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const tickets = await response.json();
        
        const stats: DashboardStats = {
          totalTickets: tickets.length,
          openTickets: tickets.filter((t: any) => t.status === 'OPEN').length,
          inProgressTickets: tickets.filter((t: any) => t.status === 'IN_PROGRESS').length,
          resolvedTickets: tickets.filter((t: any) => t.status === 'RESOLVED').length,
          recentTickets: tickets.slice(0, 5)
        };

        setStats(stats);
      } else if (response.status === 403 || response.status === 401) {
        showToast('Access Expired. Please log in again.', 'error');
        logout();
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Tickets',
      value: stats.totalTickets,
      icon: Ticket,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: 'Open Tickets',
      value: stats.openTickets,
      icon: Clock,
      color: 'bg-gradient-to-r from-yellow-500 to-orange-500',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    },
    {
      title: 'In Progress',
      value: stats.inProgressTickets,
      icon: TrendingUp,
      color: 'bg-gradient-to-r from-purple-500 to-purple-600',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    },
    {
      title: 'Resolved',
      value: stats.resolvedTickets,
      icon: CheckCircle,
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.email?.split('@')[0]}!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Here's what's happening with your support tickets today.
          </p>
        </div>
        {user?.role === 'ORG_USER' && (
          <Link
            to="/tickets/new"
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Ticket
          </Link>
        )}
      </div>

      {/* Connection Status */}
      <div className="flex items-center space-x-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-gray-600 dark:text-gray-400">
          {connected ? 'Real-time updates active' : 'Connection lost - reconnecting...'}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {card.value}
                </p>
              </div>
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <card.icon className={`h-6 w-6 ${card.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Tickets */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Tickets
            </h2>
            <Link
              to="/tickets"
              className="text-sm text-blue-600 hover:text-blue-500 transition-colors font-medium"
            >
              View all tickets
            </Link>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {stats.recentTickets && stats.recentTickets.length > 0 ? (
            stats.recentTickets.map((ticket: any) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className={`w-3 h-3 rounded-full ${
                          ticket.status === 'OPEN' ? 'bg-yellow-400' :
                          ticket.status === 'IN_PROGRESS' ? 'bg-blue-400' :
                          'bg-green-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {ticket.title}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            ticket.priority === 'HIGH' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                            ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                            'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                          }`}>
                            {ticket.priority}
                          </span>
                          {user?.role === 'ADMIN' && ticket.organizationName && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {ticket.organizationName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      ticket.status === 'OPEN' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                      ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                    }`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No tickets found. 
                {user?.role === 'ORG_USER' && (
                  <>
                    {' '}
                    <Link to="/tickets/new" className="text-blue-600 hover:text-blue-500 transition-colors">
                      Create your first ticket
                    </Link>
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions for Admins */}
      {user?.role === 'ADMIN' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center">
              <Users className="h-8 w-8 mr-4" />
              <div>
                <h3 className="text-lg font-semibold">Manage Users</h3>
                <p className="text-blue-100 text-sm">View and manage organization users</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center">
              <MessageCircle className="h-8 w-8 mr-4" />
              <div>
                <h3 className="text-lg font-semibold">Active Chats</h3>
                <p className="text-purple-100 text-sm">Monitor ongoing conversations</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 mr-4" />
              <div>
                <h3 className="text-lg font-semibold">Analytics</h3>
                <p className="text-green-100 text-sm">View support metrics and trends</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};