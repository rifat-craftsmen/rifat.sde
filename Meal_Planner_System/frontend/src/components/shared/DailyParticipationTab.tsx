import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { formatDateForAPI } from '../../utils/dateHelpers';

interface Employee {
    id: number;
    name: string;
    teamName: string | null;
    workFromHome: boolean;
    meals: {
        lunch: boolean | null;
        snacks: boolean | null;
        iftar: boolean | null;
        eventDinner: boolean | null;
        optionalDinner: boolean | null;
    };
    lastModifiedByName: string | null;
    lastModifiedAt: string | null;
    wfhDaysThisMonth: number;
}

interface DailyParticipationData {
    date: string;
    wfhOverLimitCount: number;
    totalExtraWFHDays: number;
    employees: Employee[];
}

type BulkAction = 'WFH_ALL' | 'ALL_OFF' | 'SET_ALL_MEALS' | 'UNSET_ALL_MEALS';

interface Props {
    teamScope?: boolean;
}

const DailyParticipationTab: React.FC<Props> = ({ teamScope = false }) => {
    const queryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = useState(formatDateForAPI(new Date()));
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // A date is "future" (editable) if it's strictly after today
    const today = formatDateForAPI(new Date());
    const isFutureDate = selectedDate > today;

    const { data, isLoading } = useQuery<DailyParticipationData>({
        queryKey: ['daily-participation', selectedDate, teamScope],
        queryFn: async () => {
            const response = await api.get(`/admin/daily-participation?date=${selectedDate}`);
            return response.data;
        },
    });

    const bulkMutation = useMutation({
        mutationFn: async ({ action, userIds }: { action: BulkAction; userIds: number[] }) => {
            await api.post('/admin/meals/bulk-update', {
                userIds,
                date: selectedDate,
                action,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-participation', selectedDate, teamScope] });
            setSelectedIds(new Set());
        },
    });

    const employees = data?.employees ?? [];

    const allSelected = employees.length > 0 && selectedIds.size === employees.length;
    const someSelected = selectedIds.size > 0 && !allSelected;

    const toggleAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(employees.map((e) => e.id)));
        }
    };

    const toggleOne = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleBulkAction = (action: BulkAction) => {
        if (selectedIds.size === 0) return;
        bulkMutation.mutate({ action, userIds: Array.from(selectedIds) });
    };

    const renderCheckIcon = (value: boolean | null) => {
        if (value === true) return <span className="text-green-600 dark:text-green-400 text-lg">✅</span>;
        if (value === false) return <span className="text-red-600 dark:text-red-400 text-lg">❌</span>;
        return <span className="text-slate-400 dark:text-slate-600 text-lg">➖</span>;
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Date Picker + WFH Summary Cards — single row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Date Picker */}
                <div className="card">
                    <label htmlFor="participation-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Select Date
                    </label>
                    <input
                        id="participation-date"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setSelectedIds(new Set());
                        }}
                        className="input-field max-w-xs"
                    />
                    {!isFutureDate && (
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Bulk actions are only available for future dates.
                        </p>
                    )}
                </div>

                {/* WFH Limit Crossed */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">WFH Limit Crossed</p>
                    <p className={`text-3xl font-bold ${data && data.wfhOverLimitCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>
                        {data?.wfhOverLimitCount ?? '—'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">employees over 5 WFH days</p>
                </div>

                {/* Total Extra WFH Days */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Extra WFH Days</p>
                    <p className={`text-3xl font-bold ${data && data.totalExtraWFHDays > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>
                        {data?.totalExtraWFHDays ?? '—'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">days beyond the 5-day allowance</p>
                </div>
            </div>

            {/* Bulk Action Bar — only for future dates when rows are selected */}
            {isFutureDate && selectedIds.size > 0 && (
                <div className="card mb-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                            {selectedIds.size} selected
                        </span>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => handleBulkAction('WFH_ALL')}
                                disabled={bulkMutation.isPending}
                                className="px-3 py-1.5 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                🏠 WFH
                            </button>
                            <button
                                onClick={() => handleBulkAction('ALL_OFF')}
                                disabled={bulkMutation.isPending}
                                className="px-3 py-1.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                All Off
                            </button>
                            <button
                                onClick={() => handleBulkAction('SET_ALL_MEALS')}
                                disabled={bulkMutation.isPending}
                                className="px-3 py-1.5 text-sm font-medium bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                All Meals ON
                            </button>
                            <button
                                onClick={() => handleBulkAction('UNSET_ALL_MEALS')}
                                disabled={bulkMutation.isPending}
                                className="px-3 py-1.5 text-sm font-medium bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                All Meals OFF
                            </button>
                        </div>
                        {bulkMutation.isPending && (
                            <span className="text-sm text-primary-600 dark:text-primary-400">Updating...</span>
                        )}
                        {bulkMutation.isError && (
                            <span className="text-sm text-red-600 dark:text-red-400">
                                {(bulkMutation.error as any)?.response?.data?.error || 'Update failed'}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="card">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                    {teamScope ? 'Team Participation' : 'Daily Participation'} ({employees.length} people)
                </h3>

                {employees.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    {/* Select all checkbox — only for future dates */}
                                    {isFutureDate && (
                                        <th className="px-3 py-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                                                onChange={toggleAll}
                                                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 cursor-pointer"
                                            />
                                        </th>
                                    )}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Name
                                    </th>
                                    {!teamScope && (
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            Team
                                        </th>
                                    )}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Location
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        🍱 Lunch
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        🍪 Snacks
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        🌙 Iftar
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        🎉 Event
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        🍽️ Optional
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        WFH Taken
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Modified By
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Updated At
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                                {employees.map((employee) => {
                                    const isSelected = selectedIds.has(employee.id);
                                    return (
                                        <tr
                                            key={employee.id}
                                            className={`transition-colors ${
                                                isSelected
                                                    ? 'bg-primary-50 dark:bg-primary-900/20'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            {/* Row checkbox — only for future dates */}
                                            {isFutureDate && (
                                                <td className="px-3 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleOne(employee.id)}
                                                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 cursor-pointer"
                                                    />
                                                </td>
                                            )}
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                                                {employee.name}
                                            </td>
                                            {!teamScope && (
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                                    {employee.teamName || '-'}
                                                </td>
                                            )}
                                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                {employee.workFromHome ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                                        🏠 WFH
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                                                        🏢 Office
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">{renderCheckIcon(employee.meals.lunch)}</td>
                                            <td className="px-4 py-3 text-center">{renderCheckIcon(employee.meals.snacks)}</td>
                                            <td className="px-4 py-3 text-center">{renderCheckIcon(employee.meals.iftar)}</td>
                                            <td className="px-4 py-3 text-center">{renderCheckIcon(employee.meals.eventDinner)}</td>
                                            <td className="px-4 py-3 text-center">{renderCheckIcon(employee.meals.optionalDinner)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-sm font-semibold ${employee.wfhDaysThisMonth > 5 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {employee.wfhDaysThisMonth}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                                {employee.lastModifiedByName ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                                {employee.lastModifiedAt
                                                    ? new Date(employee.lastModifiedAt).toLocaleString('en-US', {
                                                        month: 'short', day: 'numeric',
                                                        hour: '2-digit', minute: '2-digit',
                                                      })
                                                    : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-slate-500 dark:text-slate-400">
                            No participation data available for this date.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DailyParticipationTab;
