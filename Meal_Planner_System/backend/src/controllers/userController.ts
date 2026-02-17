import { Response } from 'express';
import { AuthRequest } from '../types';
import {
    createUser,
    getUserById,
    updateUser,
    deleteUser,
    generatePassword,
} from '../services/userService';

export const createUserController = async (req: AuthRequest, res: Response) => {
    try {
        const { name, email, role, teamId, password } = req.body;

        // Use provided password or generate one
        const userPassword = password || generatePassword();

        const result = await createUser({
            name,
            email,
            password: userPassword,
            role,
            teamId: teamId ? parseInt(teamId) : undefined,
        });

        return res.status(201).json({
            success: true,
            user: result.user,
            generatedPassword: result.plainPassword,
            message: 'User created successfully. Please share the password with the user.',
        });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

export const getUserController = async (req: AuthRequest, res: Response) => {
    try {
        const userIdParam = req.params.userId;
        const idToParse = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam;
        const userId = parseInt(idToParse);

        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const user = await getUserById(userId);
        return res.json({ user });
    } catch (error: any) {
        return res.status(404).json({ error: error.message });
    }
};

export const updateUserController = async (req: AuthRequest, res: Response) => {
    try {
        const userIdParam = req.params.userId;
        const idToParse = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam;
        const userId = parseInt(idToParse);

        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const { name, email, role, teamId, status } = req.body;

        const updatedUser = await updateUser(userId, {
            name,
            email,
            role,
            teamId: teamId !== undefined ? (teamId ? parseInt(teamId) : null) : undefined,
            status,
        });

        return res.json({
            success: true,
            user: updatedUser,
            message: 'User updated successfully',
        });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

export const deleteUserController = async (req: AuthRequest, res: Response) => {
    try {
        const userIdParam = req.params.userId;
        const idToParse = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam;
        const userId = parseInt(idToParse);

        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const result = await deleteUser(userId);
        return res.json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};
