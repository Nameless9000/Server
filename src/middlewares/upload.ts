import { NextFunction, Request, Response } from 'express';
import Users from '../models/user';

export default async (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers.key as string;

    if (!key) return res.status(400).json({
        success: false,
        error: 'Provide a key.',
    });

    const user = await Users.findOne({ key });

    if (!user) return res.status(400).json({
        success: false,
        error: 'Invalid key.',
    });

    if (user.blacklisted.status) return res.status(401).json({
        success: false,
        error: `You are blacklisted for: ${user.blacklisted.reason}`,
    });

    req.user = user;
    next();
};
