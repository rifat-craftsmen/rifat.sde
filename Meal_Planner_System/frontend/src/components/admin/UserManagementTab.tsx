import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { User, Team, CreateUserData, UpdateUserData, Role, UserStatus } from '../../types';

// ─── Role badge colors ───
const roleBadge = (role: string) => {
    switch (role) {
        case 'ADMIN':
            return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
        case 'LEAD':
            return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
        case 'LOGISTICS':
            return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
        default:
            return 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300';
    }
};

// ─── Create User Modal ───
interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    teams: Team[];
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, teams }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<CreateUserData>({
        name: '',
        email: '',
        role: 'EMPLOYEE',
    });
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyPassword = () => {
        navigator.clipboard.writeText(generatedPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
        setShowPassword(false);
        setCopied(false);
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
                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Generated Password:</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-lg font-mono font-bold text-slate-900 dark:text-white flex-1 tracking-widest">
                                        {showPassword ? generatedPassword : '•'.repeat(generatedPassword.length)}
                                    </p>
                                    {/* Eye toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded transition-colors"
                                        title={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                    {/* Copy button */}
                                    <button
                                        type="button"
                                        onClick={handleCopyPassword}
                                        className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded transition-colors"
                                        title="Copy password"
                                    >
                                        {copied ? (
                                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
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
                                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                                className="input-field"
                            >
                                <option value="EMPLOYEE">Employee</option>
                                <option value="LEAD">Team Lead</option>
                                <option value="ADMIN">Admin</option>
                                <option value="LOGISTICS">Logistics</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Team</label>
                            <select
                                value={formData.teamId ?? ''}
                                onChange={(e) => setFormData({ ...formData, teamId: e.target.value ? parseInt(e.target.value) : undefined })}
                                className="input-field"
                            >
                                <option value="">No Team</option>
                                {teams.map((team) => (
                                    <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
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

// ─── Edit User Modal ───
interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    teams: Team[];
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, teams }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<UpdateUserData>({
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
        status: user.status,
    });

    const updateMutation = useMutation({
        mutationFn: async (data: UpdateUserData) => {
            const response = await api.patch(`/admin/users/${user.id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-users'] });
            onClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="card max-w-md w-full animate-slide-up">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Edit User</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name</label>
                        <input
                            type="text"
                            value={formData.name ?? ''}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="input-field"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                        <input
                            type="email"
                            value={formData.email ?? ''}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            className="input-field"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Role</label>
                        <select
                            value={formData.role ?? user.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                            className="input-field"
                        >
                            <option value="EMPLOYEE">Employee</option>
                            <option value="LEAD">Team Lead</option>
                            <option value="ADMIN">Admin</option>
                            <option value="LOGISTICS">Logistics</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Team</label>
                        <select
                            value={formData.teamId ?? ''}
                            onChange={(e) => setFormData({ ...formData, teamId: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="input-field"
                        >
                            <option value="">No Team</option>
                            {teams.map((team) => (
                                <option key={team.id} value={team.id}>{team.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status</label>
                        <select
                            value={formData.status ?? user.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                            className="input-field"
                        >
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>

                    {updateMutation.isError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
                            {(updateMutation.error as any)?.response?.data?.error || 'Failed to update user'}
                        </div>
                    )}

                    <div className="flex space-x-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={updateMutation.isPending} className="flex-1 btn-primary disabled:opacity-50">
                            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Main Tab ───
const UserManagementTab: React.FC = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const queryClient = useQueryClient();

    const { data: users, isLoading } = useQuery<User[]>({
        queryKey: ['all-users', searchQuery],
        queryFn: async () => {
            const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
            const response = await api.get(`/admin/employees${params}`);
            return response.data.employees;
        },
    });

    const { data: teams = [] } = useQuery<Team[]>({
        queryKey: ['all-teams'],
        queryFn: async () => {
            const response = await api.get('/admin/teams');
            return response.data.teams;
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
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

            {/* Search */}
            <div className="mb-6">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="input-field max-w-md"
                />
            </div>

            {/* Users table */}
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
                                        <span className={`px-2 py-1 text-xs rounded-full ${roleBadge(user.role)}`}>
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
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => setEditingUser(user)}
                                                className="px-3 py-1 text-sm bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id, user.name)}
                                                disabled={deleteMutation.isPending}
                                                className="px-3 py-1 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12 text-slate-600 dark:text-slate-400">
                    <p>{searchQuery ? 'No users match your search' : 'No users found'}</p>
                </div>
            )}

            {deleteMutation.isError && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
                    {(deleteMutation.error as any)?.response?.data?.error || 'Failed to delete user'}
                </div>
            )}

            <CreateUserModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} teams={teams} />

            {editingUser && (
                <EditUserModal
                    isOpen={true}
                    onClose={() => setEditingUser(null)}
                    user={editingUser}
                    teams={teams}
                />
            )}
        </div>
    );
};

export default UserManagementTab;
