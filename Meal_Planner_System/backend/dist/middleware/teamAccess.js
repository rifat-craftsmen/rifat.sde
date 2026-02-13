import { prisma } from '../config/prismaClient.js';
export const requireTeamAccess = async (req, res, next) => {
    try {
        const userIdParam = req.params.userId;
        const idToParse = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam;
        const targetUserId = parseInt(idToParse);
        const currentUser = req.user;
        // Admins bypass team checks
        if (currentUser.role === 'ADMIN') {
            return next();
        }
        // Team Leads can only access their team members
        if (currentUser.role === 'LEAD') {
            const targetUser = await prisma.user.findUnique({
                where: { id: targetUserId },
                select: { teamId: true },
            });
            if (!targetUser) {
                return res.status(404).json({ error: 'User not found' });
            }
            if (targetUser.teamId !== currentUser.teamId) {
                return res.status(403).json({ error: 'Not authorized to access this team member' });
            }
            return next();
        }
        // Employees and Logistics shouldn't reach here
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};
