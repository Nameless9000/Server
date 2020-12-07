import { Request, Response, Router } from 'express';
import { sign } from 'jsonwebtoken';
import OAuthMiddleware from '../middlewares/OAuthMiddleware';
import UserModel from '../models/UserModel';
const router = Router();

router.get('/login', (req: Request, res: Response) => {
    req.user ?
        res.redirect(`${process.env.FRONTEND_URL}/dashboard`) :
        res.redirect(process.env.DISCORD_OAUTH_LOGIN_URL);
});

router.get('/login/callback', OAuthMiddleware, async (req: Request, res: Response) => {
    const { id, avatar } = req.discordUser;

    try {
        const user = await UserModel.findOne({ 'discord.id': id });

        if (!user) return res.status(401).redirect(process.env.FRONTEND_URL);

        if (user.discord.avatar !== avatar) await UserModel.findByIdAndUpdate(user._id, {
            'discord.avatar': avatar,
        });

        const token = sign({ _id: user._id }, process.env.JWT_SECRET);

        res.cookie('jwt', token, { httpOnly: true, secure: true });
        res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

export default router;
