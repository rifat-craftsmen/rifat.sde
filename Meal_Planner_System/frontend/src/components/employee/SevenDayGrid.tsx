import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import type { DaySchedule, UpdateMealData } from '../../types';
import { getNext7Days, formatDisplayDate, isToday, formatDateForAPI } from '../../utils/dateHelpers';

const SevenDayGrid: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: schedule, isLoading } = useQuery<DaySchedule[]>({
        queryKey: ['my-schedule', user?.id],
        queryFn: async () => {
            const response = await api.get('/meals/my-schedule');
            return response.data.schedule;
        },
    });

    const updateMealMutation = useMutation({
        mutationFn: async (data: UpdateMealData) => {
            return await api.patch('/meals/my-record', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-schedule'] });
            queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
        },
    });

    const handleMealToggle = (date: string, mealType: string, currentValue: boolean | null) => {
        const dayData = schedule?.find((d) => d.date === date);
        if (!dayData || dayData.isToday || dayData.isPast) return;

        const record = dayData.record || {
            lunch: null,
            snacks: null,
            iftar: null,
            eventDinner: null,
            optionalDinner: null,
        };

        updateMealMutation.mutate({
            date,
            lunch: mealType === 'lunch' ? !currentValue : (record.lunch ?? false),
            snacks: mealType === 'snacks' ? !currentValue : (record.snacks ?? false),
            iftar: mealType === 'iftar' ? !currentValue : (record.iftar ?? false),
            eventDinner: mealType === 'eventDinner' ? !currentValue : (record.eventDinner ?? false),
            optionalDinner: mealType === 'optionalDinner' ? !currentValue : (record.optionalDinner ?? false),
        });
    };

    const handleAllOff = (date: string) => {
        const dayData = schedule?.find((d) => d.date === date);
        if (!dayData || dayData.isToday || dayData.isPast) return;

        updateMealMutation.mutate({
            date,
            lunch: false,
            snacks: false,
            iftar: false,
            eventDinner: false,
            optionalDinner: false,
        });
    };

    if (isLoading) {
        return (
            <div className="card">
                <div className="animate-pulse space-y-4">
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">7-Day Meal Schedule</h2>

            <div className="space-y-3">
                {schedule?.map((day) => {
                    const record = day.record;
                    const mealSchedule = day.schedule;
                    const isDisabled = day.isToday || day.isPast;

                    return (
                        <div
                            key={day.date}
                            className={`p-4 rounded-lg border-2 transition-all ${isDisabled
                                ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'
                                : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-primary-300'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-slate-800 dark:text-white">
                                        {formatDisplayDate(new Date(day.date))}
                                    </h3>
                                    {day.isToday && (
                                        <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">Today (Cannot Edit)</span>
                                    )}
                                    {mealSchedule?.occasionName && (
                                        <span className="inline-block mt-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                                            {mealSchedule.occasionName}
                                        </span>
                                    )}
                                </div>

                                {!isDisabled && (
                                    <button
                                        onClick={() => handleAllOff(day.date)}
                                        className="px-3 py-1 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                        disabled={updateMealMutation.isPending}
                                    >
                                        All Off
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                {mealSchedule?.lunchEnabled !== false && (
                                    <label className={`flex items-center space-x-2 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <input
                                            type="checkbox"
                                            checked={record?.lunch ?? false}
                                            onChange={() => handleMealToggle(day.date, 'lunch', record?.lunch ?? false)}
                                            disabled={isDisabled || updateMealMutation.isPending}
                                            className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Lunch</span>
                                    </label>
                                )}

                                {mealSchedule?.snacksEnabled !== false && (
                                    <label className={`flex items-center space-x-2 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <input
                                            type="checkbox"
                                            checked={record?.snacks ?? false}
                                            onChange={() => handleMealToggle(day.date, 'snacks', record?.snacks ?? false)}
                                            disabled={isDisabled || updateMealMutation.isPending}
                                            className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Snacks</span>
                                    </label>
                                )}

                                {mealSchedule?.iftarEnabled && (
                                    <label className={`flex items-center space-x-2 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <input
                                            type="checkbox"
                                            checked={record?.iftar ?? false}
                                            onChange={() => handleMealToggle(day.date, 'iftar', record?.iftar ?? false)}
                                            disabled={isDisabled || updateMealMutation.isPending}
                                            className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Iftar</span>
                                    </label>
                                )}

                                {mealSchedule?.eventDinnerEnabled && (
                                    <label className={`flex items-center space-x-2 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <input
                                            type="checkbox"
                                            checked={record?.eventDinner ?? false}
                                            onChange={() => handleMealToggle(day.date, 'eventDinner', record?.eventDinner ?? false)}
                                            disabled={isDisabled || updateMealMutation.isPending}
                                            className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Event Dinner</span>
                                    </label>
                                )}

                                {mealSchedule?.optionalDinnerEnabled !== false && (
                                    <label className={`flex items-center space-x-2 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <input
                                            type="checkbox"
                                            checked={record?.optionalDinner ?? false}
                                            onChange={() => handleMealToggle(day.date, 'optionalDinner', record?.optionalDinner ?? false)}
                                            disabled={isDisabled || updateMealMutation.isPending}
                                            className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Optional Dinner</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SevenDayGrid;
