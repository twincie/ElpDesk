import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Users,
  Ticket,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { log } from 'console';

interface AnalyticsData {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number;
  ticketsByPriority: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  ticketsByMonth: Array<{
    month: string;
    count: number;
  }>;
  topOrganizations: Array<{
    name: string;
    ticketCount: number;
  }>;
  resolutionTrend: Array<{
    date: string;
    resolved: number;
    created: number;
  }>;
}

export const AnalyticsPage: React.FC = () => {
  const { user , logout} = useAuth();
  const { showToast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  // Redirect if not admin
  if (user?.role !== 'ADMIN') {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Access Denied
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          You need admin privileges to access analytics.
        </p>
      </div>
    );
  }

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/analytics?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else if (response.status === 403 || response.status === 401) {
        showToast('Access Expired. Please log in again.', 'error');
        logout();
      } else {
        throw new Error('Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      showToast('Failed to load analytics', 'error');
      // Mock data for demo
      // setAnalytics({
      //   totalTickets: 156,
      //   openTickets: 23,
      //   inProgressTickets: 12,
      //   resolvedTickets: 121,
      //   avgResolutionTime: 2.5,
      //   ticketsByPriority: {
      //     HIGH: 34,
      //     MEDIUM: 78,
      //     LOW: 44
      //   },
      //   ticketsByMonth: [
      //     { month: 'Jan', count: 12 },
      //     { month: 'Feb', count: 19 },
      //     { month: 'Mar', count: 15 },
      //     { month: 'Apr', count: 22 },
      //     { month: 'May', count: 28 },
      //     { month: 'Jun', count: 31 }
      //   ],
      //   topOrganizations: [
      //     { name: 'Demo Corp', ticketCount: 45 },
      //     { name: 'Tech Solutions', ticketCount: 32 },
      //     { name: 'Global Industries', ticketCount: 28 },
      //     { name: 'StartupXYZ', ticketCount: 21 }
      //   ],
      //   resolutionTrend: [
      //     { date: '2024-01-01', resolved: 8, created: 12 },
      //     { date: '2024-01-02', resolved: 15, created: 10 },
      //     { date: '2024-01-03', resolved: 12, created: 8 },
      //     { date: '2024-01-04', resolved: 18, created: 14 },
      //     { date: '2024-01-05', resolved: 22, created: 16 }
      //   ]
      // });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
  };

  const getChangePercentage = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          No Analytics Data
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Unable to load analytics data at this time.
        </p>
      </div>
    );
  }

  const resolutionRate = analytics.totalTickets > 0 
    ? (analytics.resolvedTickets / analytics.totalTickets) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Analytics Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Insights and metrics for your support ticket system
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tickets</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {analytics.totalTickets}
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600 dark:text-green-400">+12%</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">vs last period</span>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <Ticket className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolution Rate</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {resolutionRate.toFixed(1)}%
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600 dark:text-green-400">+5.2%</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">vs last period</span>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Resolution Time</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {analytics.avgResolutionTime}d
              </p>
              <div className="flex items-center mt-2">
                <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600 dark:text-green-400">-8%</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">vs last period</span>
              </div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Open Tickets</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {analytics.openTickets}
              </p>
              <div className="flex items-center mt-2">
                <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600 dark:text-green-400">-3%</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">vs last period</span>
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets by Priority */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tickets by Priority
          </h3>
          <div className="space-y-4">
            {Object.entries(analytics.ticketsByPriority).map(([priority, count]) => {
              const percentage = analytics.totalTickets > 0 ? (count / analytics.totalTickets) * 100 : 0;
              const colors = {
                HIGH: 'bg-red-500',
                MEDIUM: 'bg-yellow-500',
                LOW: 'bg-green-500'
              };
              
              return (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${colors[priority as keyof typeof colors]}`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {priority}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${colors[priority as keyof typeof colors]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-8">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Tickets */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Monthly Ticket Volume
          </h3>
          <div className="space-y-3">
            {analytics.ticketsByMonth.map((item, index) => {
              const maxCount = Math.max(...analytics.ticketsByMonth.map(m => m.count));
              const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              
              return (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12">
                    {item.month}
                  </span>
                  <div className="flex-1 mx-3">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-8">
                    {item.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Organizations */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Organizations by Tickets
          </h3>
          <div className="space-y-4">
            {analytics.topOrganizations.map((org, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                    <span className="text-white font-medium text-xs">
                      {org.name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {org.name}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {org.ticketCount} tickets
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Current Status Distribution
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Open</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {analytics.openTickets}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">In Progress</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {analytics.inProgressTickets}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Resolved</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {analytics.resolvedTickets}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};