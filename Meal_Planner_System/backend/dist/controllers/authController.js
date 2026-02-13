import { loginUser } from '../services/authService';
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const { token, user } = await loginUser(email, password);
        // Set HTTP-only cookie
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        return res.json({ success: true, user });
    }
    catch (error) {
        return res.status(401).json({ error: error.message });
    }
};
export const logout = (req, res) => {
    res.clearCookie('auth_token');
    return res.json({ success: true, message: 'Logged out successfully' });
};
export const getCurrentUser = (req, res) => {
    return res.json({ user: req.user });
};
