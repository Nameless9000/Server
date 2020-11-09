import { NextFunction, Request, Response } from 'express';
import Users from '../models/UserModel';

export default async (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers.key as string;

    if (!key) return res.status(400).json({
        success: false,
        error: 'provide a key',
    });

    const user = await Users.findOne({ key });

    if (!user) return res.status(400).json({
        success: false,
        error: 'invalid key',
    });

    if (user.blacklisted.status) return res.status(401).json({
        success: false,
        error: `you are blacklisted for: ${user.blacklisted.reason}`,
    });

    if (!user.discord.id || user.discord.id === '') return res.status(401).json({
        success: false,
        error: 'please verify your discord',
    });

    if (!user.emailVerified) return res.status(401).json({
        success: false,
        erorr: 'please verify your email',
    });

    req.user = user;
    next();
};
