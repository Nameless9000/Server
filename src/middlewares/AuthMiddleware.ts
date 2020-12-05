import { NextFunction, Request, Response } from 'express';
import UserModel from '../models/UserModel';

export default async (req: Request, res: Response, next: NextFunction) => {
    let { user } = req;

    if (user) user = await UserModel.findById(user._id);

    if (!user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    req.user = user;
    next();
};
