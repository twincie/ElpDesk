import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useToast } from '../contexts/ToastContext';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  Ticket as TicketIcon,
  Calendar,
  User,
  Building
} from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
// , parse, format

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdat: string;
  updatedat: string;
  userEmail?: string;
  organizationName?: string;
  assignedAdminEmail?: string;
}

export const TicketsPage: React.FC = () => {
  const { user , logout} = useAuth();
  const { socket } = useSocket();
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    if (socket) {
      socket.on('ticket-status-updated', (updatedTicket) => {
        setTickets(prev => prev.map(ticket => 
          ticket.id === updatedTicket.id ? updatedTicket : ticket
        ));
        showToast('Ticket status updated', 'success');
      });

      socket.on('ticket-status-notification', (notification) => {
        showToast(
          `Ticket "${notification.ticketTitle}" status changed to ${notification.newStatus}`,
          'info'
        );
        fetchTickets(); // Refresh tickets
      });

      return () => {
        socket.off('ticket-status-updated');
        socket.off('ticket-status-notification');
      };
    }
  }, [socket, showToast]);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = '/api/tickets?';
      
      if (statusFilter) url += `status=${statusFilter}&`;
      if (priorityFilter) url += `priority=${priorityFilter}&`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Tickets data:', data, typeof data);
        setTickets(data);
      } else if (response.status === 403 || response.status === 401) {
        showToast('Access Expired. Please log in again.', 'error');
        logout();
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      showToast('Failed to load tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (ticketId: number, newStatus: string) => {
    if (user?.role !== 'ADMIN') return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const updatedTicket = await response.json();
        setTickets(prev => prev.map(ticket => 
          ticket.id === ticketId ? updatedTicket : ticket
        ));
        
        // Emit socket event for real-time updates
        if (socket) {
          socket.emit('update-ticket-status', { ticketId, status: newStatus });
        }

        showToast('Ticket status updated successfully', 'success');
      } else if (response.status === 403 || response.status === 401) {
        showToast('Access Expired. Please log in again.', 'error');
        logout();
      }
    } catch (error) {
      console.error('Failed to update ticket status:', error);
      showToast('Failed to update ticket status', 'error');
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ticket.userEmail && ticket.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (ticket.organizationName && ticket.organizationName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'IN_PROGRESS':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'RESOLVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <TicketIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'LOW':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {user?.role === 'ADMIN' ? 'All Tickets' : 'My Tickets'}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {user?.role === 'ADMIN' 
              ? 'Manage and respond to all support tickets'
              : 'View and track your support requests'
            }
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

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Filter className="h-4 w-4 mr-2" />
            {filteredTickets.length} tickets found
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.length > 0 ? (
          filteredTickets.map((ticket) => (

            <div
              key={ticket.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(ticket.status)}
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {ticket.title}
                      </Link>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {ticket.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDistanceToNow(new Date(ticket.createdat), { addSuffix: true })}</span>
                        {/* <span>Created {formatDistanceToNow(format(parse(ticket.createdAt, 'yyyy-MM-dd HH:mm:ss.SSS', new Date()), 'MMM d, yyyy h:mm a'), { addSuffix: true })}</span>        */}
                      </div>
                      
                      {user?.role === 'ADMIN' && ticket.userEmail && (
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{ticket.userEmail}</span>
                        </div>
                      )}
                      
                      {user?.role === 'ADMIN' && ticket.organizationName && (
                        <div className="flex items-center space-x-1">
                          <Building className="h-4 w-4" />
                          <span>{ticket.organizationName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-3 ml-4">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>

                    {user?.role === 'ADMIN' && ticket.status !== 'RESOLVED' && (
                      <div className="flex space-x-2">
                        {ticket.status === 'OPEN' && (
                          <button
                            onClick={() => handleStatusChange(ticket.id, 'IN_PROGRESS')}
                            className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40 rounded-md transition-colors"
                          >
                            Take
                          </button>
                        )}
                        {ticket.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => handleStatusChange(ticket.id, 'RESOLVED')}
                            className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/40 rounded-md transition-colors"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <TicketIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No tickets found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchTerm || statusFilter || priorityFilter
                ? 'Try adjusting your search criteria or filters.'
                : user?.role === 'ORG_USER'
                ? "You haven't created any tickets yet."
                : 'No tickets have been submitted yet.'
              }
            </p>
            {user?.role === 'ORG_USER' && !searchTerm && !statusFilter && !priorityFilter && (
              <Link
                to="/tickets/new"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create your first ticket
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};