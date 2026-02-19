import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import type { MonthlyStats } from '../../types';

const MonthlyStatsCard: React.FC = () => {
    const { user } = useAuth();

    const { data: stats, isLoading } = useQuery<MonthlyStats>({
        queryKey: ['monthly-stats', user?.id],
        queryFn: async () => {
            const response = await api.get('/meals/my-stats');
            return response.data;
        },
    });

    const mealTypeCards = [
        { label: 'Lunch', count: stats?.breakdown.lunch || 0, color: 'from-blue-500 to-blue-600', icon: '🍱' },
        { label: 'Snacks', count: stats?.breakdown.snacks || 0, color: 'from-green-500 to-green-600', icon: '🍪' },
        { label: 'Iftar', count: stats?.breakdown.iftar || 0, color: 'from-purple-500 to-purple-600', icon: '🌙' },
        { label: 'Event Dinner', count: stats?.breakdown.eventDinner || 0, color: 'from-pink-500 to-pink-600', icon: '🎉' },
        { label: 'Optional Dinner', count: stats?.breakdown.optionalDinner || 0, color: 'from-orange-500 to-orange-600', icon: '🍽️' },
    ];

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="card animate-pulse">
                    <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Main Stats Card */}
            <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
                <div className="mb-4">
                    <p className="text-primary-100 text-sm font-medium">
                        {stats?.month} {stats?.year}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {/* Meals Taken */}
                    <div>
                        <p className="text-primary-100 text-sm font-medium mb-1">Meals Taken</p>
                        <h2 className="text-4xl font-bold">{stats?.mealsTaken || 0}</h2>
                        <p className="text-primary-100 text-xs mt-1">Up to today</p>
                    </div>

                    {/* Total Planned */}
                    <div>
                        <p className="text-primary-100 text-sm font-medium mb-1">Total Planned</p>
                        <h2 className="text-4xl font-bold">{stats?.totalMealsPlanned || 0}</h2>
                        <p className="text-primary-100 text-xs mt-1">Including future</p>
                    </div>
                </div>
            </div>

            {/* Meal Type Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {mealTypeCards.map((meal) => (
                    <div
                        key={meal.label}
                        className={`p-4 bg-gradient-to-br ${meal.color} text-white rounded-lg shadow-lg`}
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className="text-3xl mb-2">{meal.icon}</div>
                            <p className="text-white/90 text-xs font-medium mb-1">{meal.label}</p>
                            <p className="text-2xl font-bold">{meal.count}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MonthlyStatsCard;
