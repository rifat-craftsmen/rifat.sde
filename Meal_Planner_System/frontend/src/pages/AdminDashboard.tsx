import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import UserManagementTab from '../components/admin/UserManagementTab';
import ScheduleManagementTab from '../components/admin/ScheduleManagementTab';
import EmployeeProxyTab from '../components/admin/EmployeeProxyTab';
import HeadcountReportsTab from '../components/admin/HeadcountReportsTab';
import GlobalWFHTab from '../components/admin/GlobalWFHTab';
import DailyParticipationTab from '../components/shared/DailyParticipationTab';
import SevenDayGrid from '../components/employee/SevenDayGrid';

type TabType = 'my-meals' | 'users' | 'schedules' | 'proxy' | 'headcount' | 'participation' | 'global-wfh';

const AdminDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('users');

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const tabs = [
        { id: 'my-meals' as TabType, label: 'My Meals', icon: '🍱' },
        { id: 'users' as TabType, label: 'User Management', icon: '👥' },
        { id: 'schedules' as TabType, label: 'Schedule Management', icon: '📅' },
        { id: 'proxy' as TabType, label: 'Employee Proxy', icon: '✏️' },
        { id: 'headcount' as TabType, label: 'Headcount Reports', icon: '📊' },
        { id: 'participation' as TabType, label: 'Daily Participation', icon: '📋' },
        { id: 'global-wfh' as TabType, label: 'Global WFH', icon: '🏠' },
    ];

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 animate-fade-in">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">
                            Admin Dashboard
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            Manage users, schedules, and view reports
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                        Logout
                    </button>
                </div>

                {/* Tabs */}
                <div className="card mb-6">
                    <div className="flex space-x-2 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                    }`}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="card animate-fade-in">
                    {activeTab === 'my-meals' && <SevenDayGrid />}
                    {activeTab === 'users' && <UserManagementTab />}
                    {activeTab === 'schedules' && <ScheduleManagementTab />}
                    {activeTab === 'proxy' && <EmployeeProxyTab />}
                    {activeTab === 'headcount' && <HeadcountReportsTab />}
                    {activeTab === 'participation' && <DailyParticipationTab teamScope={false} />}
                    {activeTab === 'global-wfh' && <GlobalWFHTab />}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
