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
