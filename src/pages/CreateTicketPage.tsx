import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ArrowLeft, Send, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface TicketFormData {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export const CreateTicketPage: React.FC = () => {
  const { user , logout} = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<TicketFormData>({
    defaultValues: {
      priority: 'MEDIUM'
    }
  });

  // Redirect if not org user
  if (user?.role !== 'ORG_USER') {
    navigate('/');
    return null;
  }

  const onSubmit = async (data: TicketFormData) => {
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        showToast('Ticket created successfully!', 'success');
        navigate('/tickets');
      } else if (response.status === 403 || response.status === 401) {
        showToast('Access Expired. Please log in again.', 'error');
        logout();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create ticket');
      }
    } catch (error) {
      console.error('Create ticket error:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to create ticket',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedPriority = watch('priority');

  const getPriorityInfo = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          description: 'Critical issues that block your work and need immediate attention.'
        };
      case 'MEDIUM':
        return {
          icon: Info,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          description: 'Important issues that affect your workflow but have workarounds.'
        };
      case 'LOW':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          description: 'Minor issues, feature requests, or general questions.'
        };
      default:
        return {
          icon: Info,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          description: ''
        };
    }
  };

  const priorityInfo = getPriorityInfo(selectedPriority);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/tickets')}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create Support Ticket
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Describe your issue and we'll help you resolve it quickly.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              {...register('title', {
                required: 'Title is required',
                minLength: {
                  value: 5,
                  message: 'Title must be at least 5 characters long'
                },
                maxLength: {
                  value: 100,
                  message: 'Title must be less than 100 characters'
                }
              })}
              type="text"
              className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Brief description of your issue"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Priority <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['HIGH', 'MEDIUM', 'LOW'] as const).map((priority) => {
                const info = getPriorityInfo(priority);
                const Icon = info.icon;
                
                return (
                  <label
                    key={priority}
                    className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedPriority === priority
                        ? `${info.borderColor} ${info.bgColor}`
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      {...register('priority')}
                      type="radio"
                      value={priority}
                      className="sr-only"
                    />
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-5 w-5 ${selectedPriority === priority ? info.color : 'text-gray-400'}`} />
                      <div>
                        <div className={`text-sm font-medium ${
                          selectedPriority === priority 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {priority}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            
            {/* Priority Description */}
            {priorityInfo.description && (
              <div className={`mt-3 p-3 rounded-lg border ${priorityInfo.borderColor} ${priorityInfo.bgColor}`}>
                <div className="flex items-start space-x-2">
                  <priorityInfo.icon className={`h-4 w-4 mt-0.5 ${priorityInfo.color}`} />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {priorityInfo.description}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('description', {
                required: 'Description is required',
                minLength: {
                  value: 20,
                  message: 'Description must be at least 20 characters long'
                },
                maxLength: {
                  value: 2000,
                  message: 'Description must be less than 2000 characters'
                }
              })}
              rows={6}
              className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
              placeholder="Please provide detailed information about your issue, including:
• What you were trying to do
• What happened instead
• Any error messages you saw
• Steps to reproduce the problem"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? (
                <LoadingSpinner size="small" className="mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          Tips for Better Support
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li className="flex items-start space-x-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>Be specific about what you were trying to accomplish</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>Include any error messages or screenshots if applicable</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>Mention your browser, device, or operating system if relevant</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>List the steps you took that led to the issue</span>
          </li>
        </ul>
      </div>
    </div>
  );
};