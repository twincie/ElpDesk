import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useToast } from '../contexts/ToastContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { 
  ArrowLeft, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  User,
  Building,
  Calendar,
  MessageCircle
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
// import { format, parse } from 'date-fns';

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

interface Message {
  id: number;
  content: string;
  createdat: string;
  senderEmail: string;
  senderRole: 'ADMIN' | 'ORG_USER';
}

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user , logout} = useAuth();
  const { socket } = useSocket();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    console.log('Current user role:', user?.role);
    if (!id || isNaN(parseInt(id))) {
      showToast('Invalid ticket ID', 'error');
      navigate('/tickets');
      return;
    }
    fetchTicketDetails();
    fetchMessages();

    // Fallback polling
    const interval = setInterval(() => {
      fetchMessages();
    }, 1000);

    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (socket && id) {
      // Join the ticket room for real-time updates
      socket.emit('join-ticket', parseInt(id));

      socket.on('new-message', (message: Message) => {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      });

      socket.on('ticket-status-updated', (updatedTicket: Ticket) => {
        if (updatedTicket.id === parseInt(id)) {
          setTicket(updatedTicket);
          showToast('Ticket status updated', 'success');
        }
      });

      return () => {
        socket.emit('leave-ticket', parseInt(id));
        socket.off('new-message');
        socket.off('ticket-status-updated');
      };
    }
  }, [socket, id, showToast]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTicketDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tickets/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTicket(data);
      } else if (response.status === 404) {
        showToast('Ticket not found', 'error');
        navigate('/tickets');
      } else if (response.status === 403 || response.status === 401) {
        showToast('Access Expired. Please log in again.', 'error');
        logout();
      }
    } catch (error) {
      console.error('Failed to fetch ticket details:', error);
      showToast('Failed to load ticket details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/messages/ticket/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        // scrollToBottom();
      } else if (response.status === 403 || response.status === 401) {
        showToast('Access Expired. Please log in again.', 'error');
        logout();
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);

    // Declare optimisticMessage in the outer scope so it's accessible in catch
    let optimisticMessage: Message | null = null;

    try {
      if (socket) {
        optimisticMessage = {
          id: -Date.now(),
          content: newMessage.trim(),
          createdat: new Date().toISOString(),
          senderEmail: user?.email || '',
          senderRole: user?.role as 'ADMIN' | 'ORG_USER',
        };
        setMessages(prev => [...prev, optimisticMessage!]);
        setNewMessage('');
        // scrollToBottom();

        socket.emit('send-message', {
          content: newMessage.trim(),
          ticketId: parseInt(id!)
        });
        setNewMessage('');
        fetchMessages(); 
      } else {
        // Fallback to HTTP API
        const token = localStorage.getItem('token');
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: newMessage.trim(),
            ticketId: parseInt(id!)
          })
        });

        if (response.ok) {
          setNewMessage('');
          fetchMessages(); // Refresh messages
        } else if (response.status === 403 || response.status === 401) {
          showToast('Access Expired. Please log in again.', 'error');
          logout();
        } else {
          throw new Error('Failed to send message');
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      showToast('Failed to send message', 'error');
      if (optimisticMessage) {
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage!.id));
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (user?.role !== 'ADMIN' || !ticket) return;

    try {
      if (socket) {
        socket.emit('update-ticket-status', {
          ticketId: ticket.id,
          status: newStatus
        });
      } else {
        // Fallback to HTTP API
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tickets/${ticket.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
          const updatedTicket = await response.json();
          setTicket(updatedTicket);
          showToast('Ticket status updated successfully', 'success');
        } else if (response.status === 403 || response.status === 401) {
          showToast('Access Expired. Please log in again.', 'error');
          logout();
        }
      }
    } catch (error) {
      console.error('Failed to update ticket status:', error);
      showToast('Failed to update ticket status', 'error');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'IN_PROGRESS':
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
      case 'RESOLVED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
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

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Ticket not found
        </h2>
        <button
          onClick={() => navigate('/tickets')}
          className="text-blue-600 hover:text-blue-500 transition-colors"
        >
          Back to tickets
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/tickets')}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            {getStatusIcon(ticket.status)}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {ticket.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>Created {formatDistanceToNow(new Date(ticket.createdat), { addSuffix: true })}</span>
              {/* <span>Created {formatDistanceToNow(format(parse(ticket.createdAt, 'yyyy-MM-dd HH:mm:ss.SSS', new Date()), 'MMM d, yyyy h:mm a'), { addSuffix: true })}</span> */}
            </div>
            {
            user?.role === 'ADMIN' && 
            ticket.userEmail && (
              <div className="flex items-center space-x-1">
                <User className="h-4 w-4" />
                <span>{ticket.userEmail}</span>
              </div>
            )}
            {
            user?.role === 'ADMIN' && 
            ticket.organizationName && (
              <div className="flex items-center space-x-1">
                <Building className="h-4 w-4" />
                <span>{ticket.organizationName}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
            {ticket.priority}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
            {ticket.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Admin Actions */}
      {user?.role === 'ADMIN' && ticket.status !== 'RESOLVED' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Admin Actions
            </h3>
            <div className="flex space-x-2">
              {ticket.status === 'OPEN' && (
                <button
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                  className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40 rounded-md transition-colors"
                >
                  Take Ticket
                </button>
              )}
              {ticket.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => handleStatusChange('RESOLVED')}
                  className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/40 rounded-md transition-colors"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ticket Description */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Description
        </h2>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {ticket.description}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Conversation ({messages.length})
            </h2>
          </div>
        </div>

        <div className="p-6">
          {/* Messages List */}
          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {messages.length > 0 ? (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.senderRole === user?.role ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                      message.senderRole === user?.role
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${
                        message.senderRole === user?.role
                          ? 'text-blue-100'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {message.senderEmail}
                        {message.senderRole === 'ADMIN' && (
                          <span className="ml-1 px-1 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 rounded text-xs">
                            Admin
                          </span>
                        )}
                      </span>
                      <span className={`text-xs ${
                        message.senderRole === user?.role
                          ? 'text-blue-100'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {format(new Date(message.createdat), 'HH:mm')}
                        {/* <span>Created {formatDistanceToNow(new Date(ticket.createdat), { addSuffix: true })}</span> */}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No messages yet. Start the conversation!
                </p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {ticket.status !== 'RESOLVED' && (
            <form onSubmit={handleSendMessage} className="flex space-x-3">
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim() || sendingMessage}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {sendingMessage ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {sendingMessage ? 'Sending...' : 'Send'}
                </span>
              </button>
            </form>
          )}

          {ticket.status === 'RESOLVED' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-800 dark:text-green-200 font-medium">
                This ticket has been resolved
              </p>
              <p className="text-green-600 dark:text-green-300 text-sm mt-1">
                The conversation is now closed
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};