import { prisma } from '../config/prismaClient.js';
import bcrypt from 'bcryptjs';
// Generate random password
export const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
};
// Create new user
export const createUser = async (data) => {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
    });
    if (existingUser) {
        throw new Error('Email already exists');
    }
    // Validate team assignment for LEAD role
    if (data.role === 'LEAD' && data.teamId) {
        const team = await prisma.team.findUnique({
            where: { id: data.teamId },
        });
        if (team) {
            throw new Error('This team already has a lead assigned');
        }
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    // Create user
    const user = await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            password: hashedPassword,
            role: data.role,
            teamId: data.teamId,
            status: 'ACTIVE',
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            teamId: true,
            createdAt: true,
        },
    });
    return { user, plainPassword: data.password };
};
// Get user by ID
export const getUserById = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            teamId: true,
            createdAt: true,
            updatedAt: true,
            team: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });
    if (!user) {
        throw new Error('User not found');
    }
    return user;
};
// Update user
export const updateUser = async (userId, data) => {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
        where: { id: userId },
    });
    if (!existingUser) {
        throw new Error('User not found');
    }
    // If updating email, check for duplicates
    if (data.email && data.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
            where: { email: data.email },
        });
        if (emailExists) {
            throw new Error('Email already exists');
        }
    }
    // Validate team assignment for LEAD role
    if (data.role === 'LEAD' && data.teamId) {
        const team = await prisma.team.findUnique({
            where: { id: data.teamId },
        });
        if (team && team.leadId !== userId) {
            throw new Error('This team already has a lead assigned');
        }
    }
    // Update user
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            ...(data.name && { name: data.name }),
            ...(data.email && { email: data.email }),
            ...(data.role && { role: data.role }),
            ...(data.teamId !== undefined && { teamId: data.teamId }),
            ...(data.status && { status: data.status }),
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            teamId: true,
            updatedAt: true,
            team: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });
    return updatedUser;
};
// Delete user (hard delete)
export const deleteUser = async (userId) => {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
        where: { id: userId },
    });
    if (!existingUser) {
        throw new Error('User not found');
    }
    // Check if user is a team lead
    const team = await prisma.team.findFirst({
        where: { leadId: userId },
    });
    if (team) {
        throw new Error('Cannot delete user who is a team lead. Reassign team lead first.');
    }
    // Delete user (cascade will handle meal records)
    await prisma.user.delete({
        where: { id: userId },
    });
    return { success: true, message: 'User deleted successfully' };
};
// Deactivate user (soft delete)
export const deactivateUser = async (userId) => {
    return await updateUser(userId, { status: 'INACTIVE' });
};
