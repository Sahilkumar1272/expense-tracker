import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

const DashboardLayout = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Remove the useEffect auth check since ProtectedRoute already handles it
  // Just show loading spinner while authentication is being checked
  if (loading) return <LoadingSpinner message="Loading Your Dashboard..." />;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Reusable NavItem with active state
  const NavItem = ({ to, onClick, icon, label }) => {
    const isActive = location.pathname === to;
    
    return (
      <li className="relative group">
        <Link
          to={to}
          onClick={onClick}
          className={`flex items-center ${
            sidebarOpen ? 'space-x-3 px-4 py-2' : 'justify-center p-3'
          } text-white rounded-lg transition-colors ${
            isActive 
              ? 'bg-white/20 border border-white/30' 
              : 'hover:bg-white/15'
          }`}
        >
          {icon}
          {sidebarOpen && <span>{label}</span>}
        </Link>
        {!sidebarOpen && (
          <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 text-sm text-white bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-50">
            {label}
          </span>
        )}
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Sidebar */}
      <aside
        className={`sticky top-16 ${
          sidebarOpen ? 'w-56' : 'w-16'
        } transition-all duration-300 ease-in-out bg-white/10 backdrop-blur-lg border-r border-white/20 flex flex-col z-40 h-[calc(100vh-4rem)]`}
      >
        {/* Sidebar Header with only toggle */}
        <div className="p-4 border-b border-white/10 flex justify-end">
          <button
            onClick={toggleSidebar}
            className="text-white p-2 focus:outline-none"
          >
            <svg
              className={`w-6 h-6 transform transition-transform duration-300 ${
                sidebarOpen ? 'rotate-180' : 'rotate-0'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2">
          <ul className="space-y-2">
            <NavItem
              to="/dashboard"
              label="Home"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10h14V10" />
                </svg>
              }
            />
            <NavItem
              to="/dashboard/overview"
              label="Dashboard"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6h6v6H9z M5 21h14V7H5v14z" />
                </svg>
              }
            />
            <NavItem
              to="/dashboard/transactions"
              label="Transactions"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              }
            />
          </ul>
        </nav>

        {/* Bottom Section (Settings + Sign Out + Profile) */}
        <div className="p-2 border-t border-white/10">
          <ul className="space-y-2">
            <NavItem
              to="/dashboard/settings"
              label="Settings"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317a2 2 0 013.35 0 2 2 0 002.573 1.066 2 2 0 012.37 2.37 2 2 0 001.065 2.572 2 2 0 010 3.35 2 2 0 00-1.066 2.573 2 2 0 01-2.37 2.37 2 2 0 00-2.573 1.066 2 2 0 01-3.35 0 2 2 0 00-2.573-1.066 2 2 0 01-2.37-2.37 2 2 0 00-1.065-2.572 2 2 0 010-3.35 2 2 0 001.066-2.573 2 2 0 012.37-2.37A2 2 0 0010.325 4.317z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />

            {/* Sign Out */}
            <li className="relative group">
              <button
                onClick={handleLogout}
                className={`w-full flex items-center ${
                  sidebarOpen ? 'space-x-3 px-4 py-2' : 'justify-center p-3'
                } text-white hover:bg-white/15 rounded-lg transition-colors`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4-4-4m-6 8v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {sidebarOpen && <span>Sign Out</span>}
              </button>
              {!sidebarOpen && (
                <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 text-sm text-white bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-50">
                  Sign Out
                </span>
              )}
            </li>

          {/* Profile Section BELOW Sign Out */}
      <li className="mt-4 relative group">
        <div
          className={`flex items-center ${
            sidebarOpen ? 'space-x-3 px-4 py-2' : 'justify-center p-1'
          }`}
        >
          {/* Avatar */}
          <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-lg">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Name + Role (only when sidebar is expanded) */}
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="text-white font-semibold">
                {user?.name || 'Sahil Kumar'}
              </span>
              <span className="text-xs text-gray-400">Premium Member</span>
            </div>
          )}
        </div>

        {/* Tooltip when sidebar is collapsed */}
        {!sidebarOpen && (
          <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 text-sm text-white bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-50">
            {user?.name || 'Sahil Kumar'}
          </span>
        )}
      </li>

          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-16' : 'ml-16'
        }`}
      >
        {/* Top Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-lg border-b border-white/20">
          <div className="flex justify-between h-16 items-center px-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <span className="text-white font-bold text-xl">ExpenseTracker</span>
            </div>
          </div>
        </nav>

        {/* Outlet for child routes */}
        <main className="px-4 pt-20 pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;