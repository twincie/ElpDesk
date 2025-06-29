import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../hooks/useSidebar';
import { 
  Home, 
  Ticket, 
  Plus, 
  Users, 
  BarChart3, 
  Settings,
  X
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home, roles: ['ADMIN', 'ORG_USER'] },
  { name: 'All Tickets', href: '/tickets', icon: Ticket, roles: ['ADMIN', 'ORG_USER'] },
  { name: 'Create Ticket', href: '/tickets/new', icon: Plus, roles: ['ORG_USER'] },
  { name: 'Users', href: '/users', icon: Users, roles: ['ADMIN'] },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['ADMIN'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN', 'ORG_USER'] },
];

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { isOpen, toggle } = useSidebar();

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || '')
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 z-40 w-64 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
        transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 lg:hidden">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <span className="text-white font-bold text-sm">ST</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              Support Tickets
            </h1>
          </div>
          <button
            onClick={toggle}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {filteredNavigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  onClick={() => window.innerWidth < 1024 && toggle()}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-r-2 border-blue-700 dark:border-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`
                  }
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
            <h3 className="text-sm font-medium">Need Help?</h3>
            <p className="text-xs mt-1 opacity-90">
              Contact our support team for assistance.
            </p>
            <button className="mt-2 text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded transition-colors">
              Get Support
            </button>
          </div>
        </div>
      </div>
    </>
  );
};