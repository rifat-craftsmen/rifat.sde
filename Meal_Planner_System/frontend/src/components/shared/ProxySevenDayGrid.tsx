import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { DaySchedule, UpdateMealData } from '../../types';
import { formatDisplayDate } from '../../utils/dateHelpers';

interface ProxySevenDayGridProps {
    userId: number;
    userName: string;
}

const ProxySevenDayGrid: React.FC<ProxySevenDayGridProps> = ({ userId, userName }) => {
    const queryClient = useQueryClient();

    const { data: schedule, isLoading } = useQuery<DaySchedule[]>({
        queryKey: ['employee-schedule', userId],
        queryFn: async () => {
            const response = await api.get(`/admin/employee/${userId}/schedule`);
            return response.data.schedule;
        },
    });

    // Helper to convert ISO date string to YYYY-MM-DD format for API
    const extractDateString = (isoDate: string): string => {
        return isoDate.split('T')[0];
    };

    const updateMealMutation = useMutation({
        mutationFn: async (data: UpdateMealData) => {
            return await api.patch(`/admin/employee/${userId}/record`, data);
        },
        onMutate: async (newData) => {
            // Cancel in-flight queries
            await queryClient.cancelQueries({ queryKey: ['employee-schedule', userId] });

            // Get previous data
            const previousData = queryClient.getQueryData<DaySchedule[]>(['employee-schedule', userId]);

            // Optimistically update the cache
            if (previousData) {
                const updatedSchedule = previousData.map((day) => {
                    const dayDateString = extractDateString(day.date);
                    if (dayDateString === newData.date) {
                        const updatedRecord = {
                            id: day.record?.id ?? 0,
                            userId,
                            date: day.date,
                            lunch: newData.lunch,
                            snacks: newData.snacks,
                            iftar: newData.iftar,
                            eventDinner: newData.eventDinner,
                            optionalDinner: newData.optionalDinner,
                            lastModifiedBy: day.record?.lastModifiedBy,
                            updatedAt: new Date().toISOString(),
                        };
                        return {
                            ...day,
                            record: updatedRecord,
                        };
                    }
                    return day;
                });
                queryClient.setQueryData(['employee-schedule', userId], updatedSchedule);
            }

            return { previousData };
        },
        onError: (error, newData, context) => {
            // Rollback on error
            if (context?.previousData) {
                queryClient.setQueryData(['employee-schedule', userId], context.previousData);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employee-schedule', userId] });
        },
    });

    const handleMealToggle = (date: string, mealType: string) => {
        const dayData = schedule?.find((d) => d.date === date);
        if (!dayData || dayData.isToday || dayData.isPast) return;

        const dateString = extractDateString(date);
        const mealSchedule = dayData.schedule;

        // Get current values: default to true for enabled options, null for disabled ones
        const currentLunch = mealSchedule?.lunchEnabled !== false ? (dayData.record?.lunch ?? true) : null;
        const currentSnacks = mealSchedule?.snacksEnabled !== false ? (dayData.record?.snacks ?? true) : null;
        const currentIftar = mealSchedule?.iftarEnabled ? (dayData.record?.iftar ?? true) : null;
        const currentEventDinner = mealSchedule?.eventDinnerEnabled ? (dayData.record?.eventDinner ?? true) : null;
        const currentOptionalDinner = mealSchedule?.optionalDinnerEnabled ? (dayData.record?.optionalDinner ?? true) : null;

        // Toggle only the specific meal type, keep others unchanged
        const toggleValue = (current: boolean | null): boolean | null => {
            if (current === null) return null;
            return !current;
        };

        updateMealMutation.mutate({
            date: dateString,
            lunch: mealType === 'lunch' ? toggleValue(currentLunch) : currentLunch,
            snacks: mealType === 'snacks' ? toggleValue(currentSnacks) : currentSnacks,
            iftar: mealType === 'iftar' ? toggleValue(currentIftar) : currentIftar,
            eventDinner: mealType === 'eventDinner' ? toggleValue(currentEventDinner) : currentEventDinner,
            optionalDinner: mealType === 'optionalDinner' ? toggleValue(currentOptionalDinner) : currentOptionalDinner,
        });
    };

    const handleAllOff = (date: string) => {
        const dayData = schedule?.find((d) => d.date === date);
        if (!dayData || dayData.isToday || dayData.isPast) return;

        const dateString = extractDateString(date);

        updateMealMutation.mutate({
            date: dateString,
            lunch: false,
            snacks: false,
            iftar: false,
            eventDinner: false,
            optionalDinner: false,
        });
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(7)].map((_, i) => (
                    <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                ))}
            </div>
        );
    }

    return (
        <div>
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Proxy Editing:</strong> You are editing meals for <strong>{userName}</strong>. Changes will be saved with your ID as the modifier.
                </p>
            </div>

            <div className="space-y-3">
                {schedule?.map((day) => {
                    // Default to true for lunch/snacks when no record exists (matching backend defaults)
                    const lunch = day.record?.lunch ?? true;
                    const snacks = day.record?.snacks ?? true;
                    const iftar = day.record?.iftar ?? null;
                    const eventDinner = day.record?.eventDinner ?? null;
                    const optionalDinner = day.record?.optionalDinner ?? null;

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
                                        className="px-4 py-2 font-medium text-sm bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg transition-colors duration-200 active:scale-95"
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
                                            checked={lunch ?? false}
                                            onChange={() => handleMealToggle(day.date, 'lunch')}
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
                                            checked={snacks ?? false}
                                            onChange={() => handleMealToggle(day.date, 'snacks')}
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
                                            checked={iftar ?? false}
                                            onChange={() => handleMealToggle(day.date, 'iftar')}
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
                                            checked={eventDinner ?? false}
                                            onChange={() => handleMealToggle(day.date, 'eventDinner')}
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
                                            checked={optionalDinner ?? false}
                                            onChange={() => handleMealToggle(day.date, 'optionalDinner')}
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

export default ProxySevenDayGrid;
