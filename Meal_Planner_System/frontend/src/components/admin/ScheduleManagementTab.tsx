import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { MealSchedule, CreateScheduleData } from '../../types';
import { formatDateForAPI } from '../../utils/dateHelpers';

interface CreateScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CreateScheduleModal: React.FC<CreateScheduleModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<CreateScheduleData>({
        date: formatDateForAPI(new Date()),
        lunchEnabled: true,
        snacksEnabled: true,
        iftarEnabled: false,
        eventDinnerEnabled: false,
        optionalDinnerEnabled: true,
        occasionName: '',
    });

    const createMutation = useMutation({
        mutationFn: async (data: CreateScheduleData) => {
            await api.post('/admin/schedule', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meal-schedules'] });
            handleClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    const handleClose = () => {
        setFormData({
            date: formatDateForAPI(new Date()),
            lunchEnabled: true,
            snacksEnabled: true,
            iftarEnabled: false,
            eventDinnerEnabled: false,
            optionalDinnerEnabled: true,
            occasionName: '',
        });
        createMutation.reset();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="card max-w-md w-full animate-slide-up">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Create Special Schedule</h2>
                    <button onClick={handleClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            required
                            className="input-field"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Occasion Name (Optional)</label>
                        <input
                            type="text"
                            value={formData.occasionName}
                            onChange={(e) => setFormData({ ...formData, occasionName: e.target.value })}
                            className="input-field"
                            placeholder="e.g., Company Anniversary"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Enabled Meals</label>

                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.lunchEnabled}
                                onChange={(e) => setFormData({ ...formData, lunchEnabled: e.target.checked })}
                                className="w-5 h-5 text-primary-600 rounded"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">Lunch</span>
                        </label>

                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.snacksEnabled}
                                onChange={(e) => setFormData({ ...formData, snacksEnabled: e.target.checked })}
                                className="w-5 h-5 text-primary-600 rounded"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">Snacks</span>
                        </label>

                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.iftarEnabled}
                                onChange={(e) => setFormData({ ...formData, iftarEnabled: e.target.checked })}
                                className="w-5 h-5 text-primary-600 rounded"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">Iftar</span>
                        </label>

                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.eventDinnerEnabled}
                                onChange={(e) => setFormData({ ...formData, eventDinnerEnabled: e.target.checked })}
                                className="w-5 h-5 text-primary-600 rounded"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">Event Dinner</span>
                        </label>

                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.optionalDinnerEnabled}
                                onChange={(e) => setFormData({ ...formData, optionalDinnerEnabled: e.target.checked })}
                                className="w-5 h-5 text-primary-600 rounded"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">Optional Dinner</span>
                        </label>
                    </div>

                    {createMutation.isError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
                            {(createMutation.error as any)?.response?.data?.error || 'Failed to create schedule'}
                        </div>
                    )}

                    <div className="flex space-x-3">
                        <button type="button" onClick={handleClose} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={createMutation.isPending} className="flex-1 btn-primary disabled:opacity-50">
                            {createMutation.isPending ? 'Creating...' : 'Create Schedule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ScheduleManagementTab: React.FC = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: schedules, isLoading } = useQuery<MealSchedule[]>({
        queryKey: ['meal-schedules'],
        queryFn: async () => {
            const response = await api.get('/admin/schedules');
            return response.data.schedules;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (scheduleId: number) => {
            await api.delete(`/admin/schedule/${scheduleId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meal-schedules'] });
        },
    });

    const handleDelete = (scheduleId: number, date: string) => {
        if (confirm(`Are you sure you want to delete the schedule for ${date}?`)) {
            deleteMutation.mutate(scheduleId);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Schedule Management</h2>
                <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
                    <span className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Schedule
                    </span>
                </button>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    ))}
                </div>
            ) : schedules && schedules.length > 0 ? (
                <div className="grid gap-4">
                    {schedules.map((schedule) => (
                        <div key={schedule.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <h3 className="font-semibold text-slate-900 dark:text-white">{schedule.date}</h3>
                                        {schedule.occasionName && (
                                            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-full">
                                                {schedule.occasionName}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {schedule.lunchEnabled && (
                                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">Lunch</span>
                                        )}
                                        {schedule.snacksEnabled && (
                                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">Snacks</span>
                                        )}
                                        {schedule.iftarEnabled && (
                                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded">Iftar</span>
                                        )}
                                        {schedule.eventDinnerEnabled && (
                                            <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-xs rounded">Event Dinner</span>
                                        )}
                                        {schedule.optionalDinnerEnabled && (
                                            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded">Optional Dinner</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(schedule.id, schedule.date)}
                                    className="px-3 py-1 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-slate-600 dark:text-slate-400">
                    <p>No special schedules found</p>
                    <p className="text-sm mt-2">Create a schedule to customize meal options for specific dates</p>
                </div>
            )}

            <CreateScheduleModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
        </div>
    );
};

export default ScheduleManagementTab;
