import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import MonthlyStatsCard from '../components/employee/MonthlyStatsCard';
import SevenDayGrid from '../components/employee/SevenDayGrid';

const EmployeeDashboard: React.FC = () => {
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 animate-fade-in">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">
                            Welcome, {user?.name}!
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            Manage your meal preferences for the next 7 days
                        </p>
                        {user?.team && (
                            <div className="mt-2">
                                <span className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    {user.team.name}
                                </span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                        Logout
                    </button>
                </div>

                {/* Monthly Stats */}
                <div className="mb-8 animate-slide-up">
                    <MonthlyStatsCard />
                </div>

                {/* 7-Day Grid */}
                <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <SevenDayGrid />
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;
