import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import type { User } from '../types';
import ProxySevenDayGrid from '../components/shared/ProxySevenDayGrid';

interface EmployeeEditModalProps {
    employee: User;
    isOpen: boolean;
    onClose: () => void;
}

const EmployeeEditModal: React.FC<EmployeeEditModalProps> = ({ employee, isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                        Edit Meals for {employee.name}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <ProxySevenDayGrid userId={employee.id} userName={employee.name} />

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 btn-primary">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

const TeamLeadDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);

    const { data: teamMembers, isLoading } = useQuery<User[]>({
        queryKey: ['team-members', user?.teamId],
        queryFn: async () => {
            const response = await api.get('/admin/team/members');
            return response.data.members;
        },
    });

    const filteredMembers = teamMembers?.filter((member) =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 animate-fade-in">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">
                            Team Lead Dashboard
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            Manage your team's meal preferences
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                        Logout
                    </button>
                </div>

                {/* Search Bar */}
                <div className="card mb-6">
                    <input
                        type="text"
                        placeholder="Search team members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field"
                    />
                </div>

                {/* Team Members List */}
                <div className="card">
                    <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">Team Members</h2>

                    {isLoading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                            ))}
                        </div>
                    ) : filteredMembers && filteredMembers.length > 0 ? (
                        <div className="grid gap-3">
                            {filteredMembers.map((member) => (
                                <div
                                    key={member.id}
                                    onClick={() => setSelectedEmployee(member)}
                                    className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-all border-2 border-transparent hover:border-primary-300"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-slate-800 dark:text-white">{member.name}</h3>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">{member.email}</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm rounded-full">
                                                {member.role}
                                            </span>
                                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                            <p>No team members found</p>
                        </div>
                    )}
                </div>

                {/* Employee Edit Modal */}
                {selectedEmployee && (
                    <EmployeeEditModal
                        employee={selectedEmployee}
                        isOpen={!!selectedEmployee}
                        onClose={() => setSelectedEmployee(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default TeamLeadDashboard;
