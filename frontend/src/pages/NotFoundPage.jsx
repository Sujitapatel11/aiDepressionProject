import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="text-6xl font-extrabold text-purple-500 font-mono">404</div>
      <h2 className="text-2xl font-bold text-white">Page Not Found</h2>
      <p className="text-slate-400 text-sm max-w-md">
        The sanctuary space you are searching for does not exist or has been relocated.
      </p>
      <Link 
        to="/" 
        className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs inline-flex items-center space-x-2 transition border-none shadow-lg shadow-purple-600/20"
      >
        <Home className="w-4 h-4" />
        <span>Return to Sanctuary</span>
      </Link>
    </div>
  );
};

export default NotFoundPage;
