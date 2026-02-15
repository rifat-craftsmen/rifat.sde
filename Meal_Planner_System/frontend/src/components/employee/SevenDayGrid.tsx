import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import type { DaySchedule, UpdateMealData } from '../../types';
import { getNext7Days, formatDisplayDate, formatDateForAPI } from '../../utils/dateHelpers';

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

    // Helper to convert ISO date string to YYYY-MM-DD format for API
    const extractDateString = (isoDate: string): string => {
        return isoDate.split('T')[0];
    };

    const updateMealMutation = useMutation({
        mutationFn: async (data: UpdateMealData) => {
            return await api.patch('/meals/my-record', data);
        },
        onMutate: async (newData) => {
            // Cancel in-flight queries
            await queryClient.cancelQueries({ queryKey: ['my-schedule', user?.id] });

            // Get previous data
            const previousData = queryClient.getQueryData<DaySchedule[]>(['my-schedule', user?.id]);

            // Optimistically update the cache
            if (previousData) {
                const updatedSchedule = previousData.map((day) => {
                    const dayDateString = extractDateString(day.date);
                    if (dayDateString === newData.date) {
                        // Create updated record matching MealRecord structure
                        const updatedRecord = {
                            id: day.record?.id ?? 0,
                            userId: user?.id ?? 0,
                            date: newData.date,
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
                queryClient.setQueryData(['my-schedule', user?.id], updatedSchedule);
            }

            return { previousData };
        },
        onError: (error, newData, context) => {
            // Rollback on error
            if (context?.previousData) {
                queryClient.setQueryData(['my-schedule', user?.id], context.previousData);
            }
        },
        onSuccess: () => {
            // Invalidate to ensure fresh data
            queryClient.invalidateQueries({ queryKey: ['my-schedule', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
        },
    });

    const handleMealToggle = (date: string, mealType: string, currentValue: boolean | null) => {
        const dayData = schedule?.find((d) => d.date === date);
        if (!dayData || dayData.isPast) return;

        const dateString = extractDateString(date);
        // Get current values, defaulting to true for lunch/snacks, null for others
        const currentLunch = dayData.record?.lunch ?? true;
        const currentSnacks = dayData.record?.snacks ?? true;
        const currentIftar = dayData.record?.iftar ?? null;
        const currentEventDinner = dayData.record?.eventDinner ?? null;
        const currentOptionalDinner = dayData.record?.optionalDinner ?? null;

        // Toggle the specific meal type, keep others unchanged
        updateMealMutation.mutate({
            date: dateString,
            lunch: mealType === 'lunch' ? !currentLunch : currentLunch,
            snacks: mealType === 'snacks' ? !currentSnacks : currentSnacks,
            iftar: mealType === 'iftar' ? !currentIftar : currentIftar,
            eventDinner: mealType === 'eventDinner' ? !currentEventDinner : currentEventDinner,
            optionalDinner: mealType === 'optionalDinner' ? !currentOptionalDinner : currentOptionalDinner,
        });
    };

    const handleAllOff = (date: string) => {
        const dayData = schedule?.find((d) => d.date === date);
        if (!dayData || dayData.isPast) return;

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
                    // Default to true for lunch/snacks when no record exists (matching backend defaults)
                    const lunch = day.record?.lunch ?? true;
                    const snacks = day.record?.snacks ?? true;
                    const iftar = day.record?.iftar ?? null;
                    const eventDinner = day.record?.eventDinner ?? null;
                    const optionalDinner = day.record?.optionalDinner ?? null;

                    const mealSchedule = day.schedule;
                    const isDisabled = day.isPast;

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
                                        <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">Today</span>
                                    )}
                                    {day.isPast && !day.isToday && (
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Past</span>
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
                                            onChange={() => handleMealToggle(day.date, 'lunch', lunch)}
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
                                            onChange={() => handleMealToggle(day.date, 'snacks', snacks)}
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
                                            onChange={() => handleMealToggle(day.date, 'iftar', iftar)}
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
                                            onChange={() => handleMealToggle(day.date, 'eventDinner', eventDinner)}
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
                                            onChange={() => handleMealToggle(day.date, 'optionalDinner', optionalDinner)}
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
