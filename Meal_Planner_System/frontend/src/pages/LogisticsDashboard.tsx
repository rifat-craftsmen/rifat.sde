import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import type { HeadcountData } from '../types';
import { formatDateForAPI } from '../utils/dateHelpers';

const LogisticsDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [selectedDate, setSelectedDate] = useState(formatDateForAPI(new Date()));

    const { data: headcount, isLoading } = useQuery<HeadcountData>({
        queryKey: ['headcount', selectedDate],
        queryFn: async () => {
            const response = await api.get(`/admin/headcount?date=${selectedDate}`);
            return response.data;
        },
    });

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const mealCards = [
        { label: 'Lunch', count: headcount?.lunch || 0, color: 'from-blue-500 to-blue-600', icon: '🍱' },
        { label: 'Snacks', count: headcount?.snacks || 0, color: 'from-green-500 to-green-600', icon: '🍪' },
        { label: 'Iftar', count: headcount?.iftar || 0, color: 'from-purple-500 to-purple-600', icon: '🌙' },
        { label: 'Event Dinner', count: headcount?.eventDinner || 0, color: 'from-pink-500 to-pink-600', icon: '🎉' },
        { label: 'Optional Dinner', count: headcount?.optionalDinner || 0, color: 'from-orange-500 to-orange-600', icon: '🍽️' },
    ];

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 animate-fade-in">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">
                            Logistics Dashboard
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            View daily meal headcounts
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                        Logout
                    </button>
                </div>

                {/* Date Picker */}
                <div className="card mb-6">
                    <label htmlFor="date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Select Date
                    </label>
                    <input
                        id="date"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="input-field max-w-xs"
                    />
                </div>

                {/* Total Employees Card */}
                <div className="card mb-6 bg-gradient-to-br from-slate-700 to-slate-800 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-300 text-sm font-medium mb-1">Total Employees</p>
                            <h2 className="text-5xl font-bold">{headcount?.totalEmployees || 0}</h2>
                        </div>
                        <div className="bg-white/20 p-4 rounded-full">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Meal Headcount Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        [...Array(5)].map((_, i) => (
                            <div key={i} className="card animate-pulse">
                                <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                            </div>
                        ))
                    ) : (
                        mealCards.map((meal) => (
                            <div key={meal.label} className={`card bg-gradient-to-br ${meal.color} text-white`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-white/80 text-sm font-medium mb-1">{meal.label}</p>
                                        <h3 className="text-4xl font-bold">{meal.count}</h3>
                                        <p className="text-white/80 text-sm mt-1">people</p>
                                    </div>
                                    <div className="text-5xl opacity-80">{meal.icon}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Info Note */}
                <div className="mt-6 card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-3">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Read-Only Access</h4>
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                As a logistics user, you can view headcount reports but cannot edit meal preferences. Contact an administrator for any changes needed.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogisticsDashboard;
