import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { User, CreateUserData, UpdateUserData } from '../../types';

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<CreateUserData>({
        name: '',
        email: '',
        role: 'EMPLOYEE',
    });
    const [generatedPassword, setGeneratedPassword] = useState('');

    const createMutation = useMutation({
        mutationFn: async (data: CreateUserData) => {
            const response = await api.post('/admin/users', data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['all-users'] });
            setGeneratedPassword(data.generatedPassword);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    const handleClose = () => {
        setFormData({ name: '', email: '', role: 'EMPLOYEE' });
        setGeneratedPassword('');
        createMutation.reset();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="card max-w-md w-full animate-slide-up">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Create New User</h2>
                    <button onClick={handleClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {generatedPassword ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">User Created Successfully!</h3>
                            <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                                Please share this password with the user. It will not be shown again.
                            </p>
                            <div className="p-3 bg-white dark:bg-slate-800 rounded border border-green-300 dark:border-green-700">
                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Generated Password:</p>
                                <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">{generatedPassword}</p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="w-full btn-primary">
                            Done
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="input-field"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                className="input-field"
                                placeholder="john@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Role</label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                className="input-field"
                            >
                                <option value="EMPLOYEE">Employee</option>
                                <option value="LEAD">Team Lead</option>
                                <option value="ADMIN">Admin</option>
                                <option value="LOGISTICS">Logistics</option>
                            </select>
                        </div>

                        {createMutation.isError && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
                                {(createMutation.error as any)?.response?.data?.error || 'Failed to create user'}
                            </div>
                        )}

                        <div className="flex space-x-3">
                            <button type="button" onClick={handleClose} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={createMutation.isPending} className="flex-1 btn-primary disabled:opacity-50">
                                {createMutation.isPending ? 'Creating...' : 'Create User'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

const UserManagementTab: React.FC = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: users, isLoading } = useQuery<User[]>({
        queryKey: ['all-users'],
        queryFn: async () => {
            const response = await api.get('/admin/employees');
            return response.data.employees;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (userId: number) => {
            await api.delete(`/admin/users/${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-users'] });
        },
    });

    const handleDelete = (userId: number, userName: string) => {
        if (confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
            deleteMutation.mutate(userId);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">User Management</h2>
                <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
                    <span className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create User
                    </span>
                </button>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    ))}
                </div>
            ) : users && users.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="text-left p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Name</th>
                                <th className="text-left p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Email</th>
                                <th className="text-left p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Role</th>
                                <th className="text-left p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Team</th>
                                <th className="text-left p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                                <th className="text-right p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="p-3 text-sm text-slate-900 dark:text-white font-medium">{user.name}</td>
                                    <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{user.email}</td>
                                    <td className="p-3">
                                        <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs rounded-full">
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-3 text-sm text-slate-600 dark:text-slate-400">
                                        {user.team?.name || '-'}
                                    </td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs rounded-full ${user.status === 'ACTIVE'
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                            }`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() => handleDelete(user.id, user.name)}
                                            className="px-3 py-1 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12 text-slate-600 dark:text-slate-400">
                    <p>No users found</p>
                </div>
            )}

            <CreateUserModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
        </div>
    );
};

export default UserManagementTab;
