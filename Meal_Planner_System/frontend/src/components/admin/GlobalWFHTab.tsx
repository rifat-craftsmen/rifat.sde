import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { formatDateForAPI } from '../../utils/dateHelpers';
import type { GlobalWFHPeriod } from '../../types';

const GlobalWFHTab: React.FC = () => {
    const queryClient = useQueryClient();
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [note, setNote] = useState('');

    const today = formatDateForAPI(new Date());

    const { data, isLoading } = useQuery<{ periods: GlobalWFHPeriod[] }>({
        queryKey: ['global-wfh'],
        queryFn: async () => {
            const response = await api.get('/admin/global-wfh');
            return response.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            await api.post('/admin/global-wfh', { dateFrom, dateTo, note: note || undefined });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-wfh'] });
            queryClient.invalidateQueries({ queryKey: ['admin-headcount'] });
            setDateFrom('');
            setDateTo('');
            setNote('');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/admin/global-wfh/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-wfh'] });
            queryClient.invalidateQueries({ queryKey: ['admin-headcount'] });
        },
    });

    const periods = data?.periods ?? [];

    const getPeriodStatus = (period: GlobalWFHPeriod): 'active' | 'upcoming' | 'past' => {
        const from = period.dateFrom.split('T')[0];
        const to = period.dateTo.split('T')[0];
        if (to < today) return 'past';
        if (from <= today && today <= to) return 'active';
        return 'upcoming';
    };

    const formatDate = (isoDate: string) => {
        const d = new Date(isoDate);
        return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
    };

    const isFormValid = dateFrom && dateTo && dateTo >= dateFrom;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Global WFH Management</h2>
            </div>

            {/* Create Form */}
            <div className="card mb-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                    Declare Company-wide WFH Period
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    During a global WFH period, the headcount report will reflect all employees as working from home.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            From Date
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            min={today}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="input-field w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            To Date
                        </label>
                        <input
                            type="date"
                            value={dateTo}
                            min={dateFrom || today}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="input-field w-full"
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Note <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. Company-wide remote work week"
                        className="input-field w-full"
                    />
                </div>

                {createMutation.isError && (
                    <p className="mb-3 text-sm text-red-600 dark:text-red-400">
                        {(createMutation.error as any)?.response?.data?.error || 'Failed to create period'}
                    </p>
                )}

                <button
                    onClick={() => createMutation.mutate()}
                    disabled={!isFormValid || createMutation.isPending}
                    className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {createMutation.isPending ? 'Saving...' : '🏠 Apply WFH Period'}
                </button>
            </div>

            {/* Periods List */}
            <div className="card">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                    WFH Periods ({periods.length})
                </h3>

                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        ))}
                    </div>
                ) : periods.length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400 text-sm py-4 text-center">
                        No global WFH periods declared.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {periods.map((period) => {
                            const status = getPeriodStatus(period);
                            return (
                                <div
                                    key={period.id}
                                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                >
                                    <div className="flex items-start gap-3">
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-slate-900 dark:text-white text-sm">
                                                    {formatDate(period.dateFrom)} — {formatDate(period.dateTo)}
                                                </span>
                                                {status === 'active' && (
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                                                        Active
                                                    </span>
                                                )}
                                                {status === 'upcoming' && (
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                                                        Upcoming
                                                    </span>
                                                )}
                                                {status === 'past' && (
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full">
                                                        Past
                                                    </span>
                                                )}
                                            </div>
                                            {period.note && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    {period.note}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteMutation.mutate(period.id)}
                                        disabled={deleteMutation.isPending}
                                        className="ml-4 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GlobalWFHTab;
