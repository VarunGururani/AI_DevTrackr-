import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-dark-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-xl font-bold">DevTrackr</span>
            </Link>
            <div className="ml-10 flex items-center space-x-4">
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/dashboard') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-dark-800 hover:text-white'}`}
              >
                Dashboard
              </Link>
              <Link
                to="/github"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/github') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-dark-800 hover:text-white'}`}
              >
                GitHub
              </Link>
              <Link
                to="/insights"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/insights') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-dark-800 hover:text-white'}`}
              >
                AI Insights
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-300">
              {user?.name || user?.email}
            </span>
            <button
              onClick={logout}
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
