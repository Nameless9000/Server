import { NextFunction, Request, Response } from 'express';
import { OAuth } from '../utils/OAuthUtil';

export default async (req: Request, res: Response, next: NextFunction) => {
    const { user } = req;

    if (user) return res.status(400).json({
        success: false,
        error: 'you are already logged in',
    });

    const { code } = req.query;
    const { validate, getUser } = new OAuth(code as string);

    try {
        await validate();
        const user = await getUser();

        req.discordUser = user;
        next();
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};
