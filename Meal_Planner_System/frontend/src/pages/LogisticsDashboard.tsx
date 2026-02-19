import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import type { HeadcountData } from '../types';
import { formatDateForAPI } from '../utils/dateHelpers';

const formatAnnouncement = (headcount: HeadcountData, selectedDate: string): string => {
    const dateStr = new Date(selectedDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });

    const lines: string[] = [];

    lines.push(`📅 Meal Headcount — ${dateStr}`);
    lines.push('');

    if (headcount.globalWFHActive) {
        lines.push('🏠 Global WFH Period Active');
        if (headcount.globalWFHNote) lines.push(`   Note: ${headcount.globalWFHNote}`);
        lines.push('');
    }

    lines.push('🍽️ Meal Headcount:');
    if (headcount.mealTotals.lunch > 0) lines.push(`   🍱 Lunch: ${headcount.mealTotals.lunch} people`);
    if (headcount.mealTotals.snacks > 0) lines.push(`   🍪 Snacks: ${headcount.mealTotals.snacks} people`);
    if (headcount.mealTotals.iftar > 0) lines.push(`   🌙 Iftar: ${headcount.mealTotals.iftar} people`);
    if (headcount.mealTotals.eventDinner > 0) lines.push(`   🎉 Event Dinner: ${headcount.mealTotals.eventDinner} people`);
    if (headcount.mealTotals.optionalDinner > 0) lines.push(`   🍽️ Optional Dinner: ${headcount.mealTotals.optionalDinner} people`);
    lines.push('');

    lines.push(`📊 Total Meals: ${headcount.overallTotal}`);
    lines.push('');

    lines.push('📍 Work Location:');
    lines.push(`   🏢 Office: ${headcount.workLocationSplit.office} people`);
    lines.push(`   🏠 WFH: ${headcount.workLocationSplit.wfh} people`);

    if (headcount.teamBreakdown.length > 0) {
        lines.push('');
        lines.push('👥 Team Breakdown:');
        headcount.teamBreakdown.forEach((team) => {
            lines.push(`   ${team.teamName}: ${team.totalMeals} meals`);
        });
    }

    return lines.join('\n');
};

const LogisticsDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [selectedDate, setSelectedDate] = useState(formatDateForAPI(new Date()));
    const [showModal, setShowModal] = useState(false);
    const [copied, setCopied] = useState(false);

    const { data: headcount, isLoading } = useQuery<HeadcountData>({
        queryKey: ['headcount', selectedDate],
        queryFn: async () => {
            const response = await api.get(`/admin/headcount?date=${selectedDate}`);
            return response.data;
        },
    });

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const handleCopy = () => {
        if (!headcount) return;
        navigator.clipboard.writeText(formatAnnouncement(headcount, selectedDate));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const mealCards = [
        { label: 'Lunch', count: headcount?.mealTotals.lunch || 0, color: 'from-blue-500 to-blue-600', icon: '🍱' },
        { label: 'Snacks', count: headcount?.mealTotals.snacks || 0, color: 'from-green-500 to-green-600', icon: '🍪' },
        { label: 'Iftar', count: headcount?.mealTotals.iftar || 0, color: 'from-purple-500 to-purple-600', icon: '🌙' },
        { label: 'Event Dinner', count: headcount?.mealTotals.eventDinner || 0, color: 'from-pink-500 to-pink-600', icon: '🎉' },
        { label: 'Optional Dinner', count: headcount?.mealTotals.optionalDinner || 0, color: 'from-orange-500 to-orange-600', icon: '🍽️' },
    ];

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 animate-fade-in">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">
                            Logistics Dashboard
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            View daily meal headcounts for preparation
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {headcount && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                📣 Generate Announcement
                            </button>
                        )}
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Announcement Modal */}
                {showModal && headcount && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Daily Announcement</h3>
                                <button
                                    onClick={() => { setShowModal(false); setCopied(false); }}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none"
                                >
                                    ×
                                </button>
                            </div>
                            <textarea
                                readOnly
                                value={formatAnnouncement(headcount, selectedDate)}
                                className="w-full h-72 p-3 text-sm font-mono bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg resize-none focus:outline-none"
                            />
                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    onClick={() => { setShowModal(false); setCopied(false); }}
                                    className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={handleCopy}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        copied
                                            ? 'bg-green-500 text-white'
                                            : 'bg-primary-600 hover:bg-primary-700 text-white'
                                    }`}
                                >
                                    {copied ? '✓ Copied!' : 'Copy to Clipboard'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Date Picker */}
                <div className="card mb-6">
                    <label htmlFor="date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Select Date
                    </label>
                    <input
                        id="date"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="input-field max-w-xs"
                    />
                    {headcount?.globalWFHActive && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-800 dark:text-blue-200">
                            🏠 Global WFH Period Active
                            {headcount.globalWFHNote && <span className="ml-2">- {headcount.globalWFHNote}</span>}
                        </div>
                    )}
                </div>

                {/* Overall Total & Work Location Split */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Overall Total Meals Card */}
                    <div className="card bg-gradient-to-br from-slate-700 to-slate-800 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-300 text-sm font-medium mb-1">Overall Total Meals</p>
                                <h2 className="text-5xl font-bold">{headcount?.overallTotal || 0}</h2>
                                <p className="text-slate-300 text-sm mt-1">All meal types combined</p>
                            </div>
                            <div className="bg-white/20 p-4 rounded-full">
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Work Location Split Card */}
                    <div className="card bg-gradient-to-br from-indigo-600 to-indigo-700 text-white">
                        <p className="text-indigo-100 text-sm font-medium mb-3">Work Location</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-indigo-100 text-xs mb-1">🏢 Office</p>
                                <h3 className="text-3xl font-bold">{headcount?.workLocationSplit.office || 0}</h3>
                            </div>
                            <div>
                                <p className="text-indigo-100 text-xs mb-1">🏠 WFH</p>
                                <h3 className="text-3xl font-bold">{headcount?.workLocationSplit.wfh || 0}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Meal Type Breakdown */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">Meal Type Breakdown</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
                            ))
                        ) : (
                            mealCards.map((meal) => (
                                <div key={meal.label} className={`p-6 bg-gradient-to-br ${meal.color} text-white rounded-xl shadow-lg`}>
                                    <div className="flex flex-col items-center text-center">
                                        <div className="text-4xl mb-2">{meal.icon}</div>
                                        <p className="text-white/90 text-xs font-medium mb-1">{meal.label}</p>
                                        <h3 className="text-3xl font-bold">{meal.count}</h3>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Team Breakdown */}
                {headcount?.teamBreakdown && headcount.teamBreakdown.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">Team Breakdown</h3>
                        <div className="grid gap-4">
                            {headcount.teamBreakdown.map((team) => (
                                <div key={team.teamId} className="card bg-white dark:bg-slate-800">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold text-slate-900 dark:text-white">{team.teamName}</h4>
                                        <div className="text-right">
                                            <p className="text-sm text-slate-600 dark:text-slate-400">Total Meals</p>
                                            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{team.totalMeals}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2 text-center text-sm">
                                        <div>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Lunch</p>
                                            <p className="font-semibold text-slate-900 dark:text-white">{team.lunch}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Snacks</p>
                                            <p className="font-semibold text-slate-900 dark:text-white">{team.snacks}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Iftar</p>
                                            <p className="font-semibold text-slate-900 dark:text-white">{team.iftar}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Event</p>
                                            <p className="font-semibold text-slate-900 dark:text-white">{team.eventDinner}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Optional</p>
                                            <p className="font-semibold text-slate-900 dark:text-white">{team.optionalDinner}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Info Note */}
                <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-3">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Read-Only Access</h4>
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                As a logistics user, you can view headcount reports but cannot edit meal preferences. Contact an administrator for any changes needed.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogisticsDashboard;
