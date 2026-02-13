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

    if (isLoading) {
        return (
            <div className="card animate-pulse">
                < div className="h-24 bg-slate-200 dark:bg-slate-700 rounded" ></div >
            </div >
        );
    }

    return (
        <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-primary-100 text-sm font-medium mb-1">This Month</p>
                    <h2 className="text-4xl font-bold">{stats?.totalMeals || 0}</h2>
                    <p className="text-primary-100 mt-1">Meals Taken</p>
                </div>
                <div className="bg-white/20 p-4 rounded-full">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            </div>

            {stats && (
                <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-3 gap-2 text-sm">
                    <div>
                        <p className="text-primary-100">Lunch</p>
                        <p className="font-semibold">{stats.lunchCount}</p>
                    </div>
                    <div>
                        <p className="text-primary-100">Snacks</p>
                        <p className="font-semibold">{stats.snacksCount}</p>
                    </div>
                    <div>
                        <p className="text-primary-100">Dinner</p>
                        <p className="font-semibold">{stats.optionalDinnerCount}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonthlyStatsCard;
