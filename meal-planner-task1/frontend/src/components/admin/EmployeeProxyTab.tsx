import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import type { User } from '../../types';
import ProxySevenDayGrid from '../shared/ProxySevenDayGrid';

const EmployeeProxyTab: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);

    const { data: employees, isLoading } = useQuery<User[]>({
        queryKey: ['all-employees'],
        queryFn: async () => {
            const response = await api.get('/admin/employees');
            return response.data.employees;
        },
    });

    const filteredEmployees = employees?.filter((emp) =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Employee Proxy Editing</h2>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search employees by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field"
                />
            </div>

            {/* Employee List */}
            {isLoading ? (
                <div className="space-y-3">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    ))}
                </div>
            ) : filteredEmployees && filteredEmployees.length > 0 ? (
                <div className="grid gap-3">
                    {filteredEmployees.map((employee) => (
                        <div
                            key={employee.id}
                            onClick={() => setSelectedEmployee(employee)}
                            className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-all border-2 border-transparent hover:border-primary-300"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-slate-800 dark:text-white">{employee.name}</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">{employee.email}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm rounded-full">
                                        {employee.role}
                                    </span>
                                    {employee.team && (
                                        <span className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-full">
                                            {employee.team.name}
                                        </span>
                                    )}
                                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-slate-600 dark:text-slate-400">
                    <p>No employees found</p>
                </div>
            )}

            {/* Employee Edit Modal */}
            {selectedEmployee && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                                Edit Meals for {selectedEmployee.name}
                            </h2>
                            <button
                                onClick={() => setSelectedEmployee(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <ProxySevenDayGrid userId={selectedEmployee.id} userName={selectedEmployee.name} />

                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setSelectedEmployee(null)} className="px-4 py-2 btn-primary">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeProxyTab;
