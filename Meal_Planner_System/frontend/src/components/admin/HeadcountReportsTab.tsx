import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import type { HeadcountData } from '../../types';
import { formatDateForAPI } from '../../utils/dateHelpers';

const HeadcountReportsTab: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState(formatDateForAPI(new Date()));

    const { data: headcount, isLoading } = useQuery<HeadcountData>({
        queryKey: ['admin-headcount', selectedDate],
        queryFn: async () => {
            const response = await api.get(`/admin/headcount?date=${selectedDate}`);
            return response.data;
        },
    });

    const mealCards = [
        { label: 'Lunch', count: headcount?.lunch || 0, color: 'from-blue-500 to-blue-600', icon: '🍱' },
        { label: 'Snacks', count: headcount?.snacks || 0, color: 'from-green-500 to-green-600', icon: '🍪' },
        { label: 'Iftar', count: headcount?.iftar || 0, color: 'from-purple-500 to-purple-600', icon: '🌙' },
        { label: 'Event Dinner', count: headcount?.eventDinner || 0, color: 'from-pink-500 to-pink-600', icon: '🎉' },
        { label: 'Optional Dinner', count: headcount?.optionalDinner || 0, color: 'from-orange-500 to-orange-600', icon: '🍽️' },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Headcount Reports</h2>
            </div>

            {/* Date Picker */}
            <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <label htmlFor="admin-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Select Date
                </label>
                <input
                    id="admin-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="input-field max-w-xs"
                />
            </div>

            {/* Total Employees Card */}
            <div className="mb-6 p-6 bg-gradient-to-br from-slate-700 to-slate-800 text-white rounded-xl shadow-lg">
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
                        <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
                    ))
                ) : (
                    mealCards.map((meal) => (
                        <div key={meal.label} className={`p-6 bg-gradient-to-br ${meal.color} text-white rounded-xl shadow-lg`}>
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
        </div>
    );
};

export default HeadcountReportsTab;
