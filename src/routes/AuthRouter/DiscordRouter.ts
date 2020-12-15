import { Request, Response, Router } from 'express';
import { sign } from 'jsonwebtoken';
import OAuthMiddleware from '../../middlewares/OAuthMiddleware';
import PasswordResetModel from '../../models/PasswordResetModel';
import UserModel from '../../models/UserModel';
const router = Router();

router.get('/login', (req: Request, res: Response) => {
    req.user ?
        res.redirect(`${process.env.FRONTEND_URL}/dashboard`) :
        res.redirect(process.env.DISCORD_LOGIN_URL);
});

router.get('/login/callback', OAuthMiddleware(), async (req: Request, res: Response) => {
    const { id, avatar } = req.discord.user;

    try {
        const user = await UserModel.findOne({ 'discord.id': id });

        if (!user || !user.emailVerified || user.blacklisted.status)
            return res.status(401).redirect(process.env.FRONTEND_URL);

        const passwordReset = await PasswordResetModel.findOne({ user: user._id });
        if (passwordReset) await passwordReset.remove();

        const update = {
            lastLogin: new Date(),
        };

        if (user.discord.avatar !== avatar) update['discord.avatar'] = `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`,

        await UserModel.findByIdAndUpdate(user._id, update);

        const refreshToken = sign({ _id: user._id }, process.env.REFRESH_TOKEN_SECRET);

        res.cookie('x-auth-token', refreshToken, { httpOnly: true, secure: false });
        res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.get('/link', (req: Request, res: Response) => {
    req.user ?
        res.redirect(process.env.DISCORD_LINK_URL) :
        res.status(401).json({
            success: false,
            error: 'unauthorized',
        });
});

router.get('/link/callback', OAuthMiddleware('link'), async (req: Request, res: Response) => {
    let { user } = req;

    if (!user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    user = await UserModel.findById(user._id);

    if (!user) return res.status(401).json({
        success: false,
        error: 'invalid session',
    });

    if (!user.emailVerified) return res.status(401).json({
        success: false,
        error: 'your email is not verified',
    });

    try {
        const { id, avatar } = req.discord.user;

        await req.discord.addGuildMember(user);

        await UserModel.findByIdAndUpdate(user._id, {
            discord: {
                id,
                avatar: `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`,
            },
        });

        res.status(200).redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

export default router;
