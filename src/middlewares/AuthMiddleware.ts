import { NextFunction, Request, Response } from 'express';
import UserModel from '../models/UserModel';

export default async (req: Request, res: Response, next: NextFunction) => {
    let { user } = req;

    if (user) user = await UserModel.findById(user._id)
        .select('-__v -password');

    if (!user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    if (!user.emailVerified) return res.status(401).json({
        success: false,
        error: 'please verify your email',
    });

    if (user.blacklisted.status) return res.status(401).json({
        success: false,
        error: `you are blacklisted for: ${user.blacklisted.reason}`,
    });

    req.user = user;
    next();
};
