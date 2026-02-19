import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { formatDateForAPI } from '../../utils/dateHelpers';

interface DailyParticipationData {
    date: string;
    employees: Array<{
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
    }>;
}

interface Props {
    teamScope?: boolean; // If true, only show team members (for Team Lead)
}

const DailyParticipationTab: React.FC<Props> = ({ teamScope = false }) => {
    const [selectedDate, setSelectedDate] = useState(formatDateForAPI(new Date()));

    const { data, isLoading } = useQuery<DailyParticipationData>({
        queryKey: ['daily-participation', selectedDate, teamScope],
        queryFn: async () => {
            const response = await api.get(`/admin/daily-participation?date=${selectedDate}`);
            return response.data;
        },
    });

    const renderCheckIcon = (value: boolean | null) => {
        if (value === true) {
            return <span className="text-green-600 dark:text-green-400 text-lg">✅</span>;
        } else if (value === false) {
            return <span className="text-red-600 dark:text-red-400 text-lg">❌</span>;
        } else {
            return <span className="text-slate-400 dark:text-slate-600 text-lg">➖</span>;
        }
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
            {/* Date Picker */}
            <div className="card mb-6">
                <label htmlFor="participation-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Select Date
                </label>
                <input
                    id="participation-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="input-field max-w-xs"
                />
            </div>

            {/* Employee Participation Table */}
            <div className="card">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                    {teamScope ? 'Team Participation' : 'Daily Participation'} ({data?.employees.length || 0} people)
                </h3>

                {data && data.employees.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
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
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                                {data.employees.map((employee) => (
                                    <tr key={employee.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
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
                                        <td className="px-4 py-3 text-center">
                                            {renderCheckIcon(employee.meals.lunch)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {renderCheckIcon(employee.meals.snacks)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {renderCheckIcon(employee.meals.iftar)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {renderCheckIcon(employee.meals.eventDinner)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {renderCheckIcon(employee.meals.optionalDinner)}
                                        </td>
                                    </tr>
                                ))}
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
