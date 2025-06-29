import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './contexts/SocketContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminRegisterPage } from './pages/AdminRegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { TicketsPage } from './pages/TicketsPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { CreateTicketPage } from './pages/CreateTicketPage';
import { UsersPage } from './pages/UsersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <SocketProvider>
              <NotificationProvider>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/admin/register" element={<AdminRegisterPage />} />
                  
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Layout>
                        <DashboardPage />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/tickets" element={
                    <ProtectedRoute>
                      <Layout>
                        <TicketsPage />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/tickets/new" element={
                    <ProtectedRoute>
                      <Layout>
                        <CreateTicketPage />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/tickets/:id" element={
                    <ProtectedRoute>
                      <Layout>
                        <TicketDetailPage />
                      </Layout>
                    </ProtectedRoute>
                  } />

                  <Route path="/users" element={
                      <ProtectedRoute adminOnly>
                        <Layout>
                          <UsersPage />
                        </Layout>
                      </ProtectedRoute>
                    } />

                    <Route path="/analytics" element={
                      <ProtectedRoute adminOnly>
                        <Layout>
                          <AnalyticsPage />
                        </Layout>
                      </ProtectedRoute>
                    } />

                    <Route path="/settings" element={
                      <ProtectedRoute>
                        <Layout>
                          <SettingsPage />
                        </Layout>
                      </ProtectedRoute>
                    } />
                </Routes>
              </div>
              </NotificationProvider>
            </SocketProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;