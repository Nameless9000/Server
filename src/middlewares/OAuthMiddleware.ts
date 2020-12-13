import { NextFunction, Request, Response } from 'express';
import { OAuth } from '../utils/OAuthUtil';

export default (request: string = 'login') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const { user } = req;

        if (!user && request === 'link' || (user && request === 'login')) return res.status(400).json({
            success: false,
            error: 'unauthorized',
        });

        const { code } = req.query;
        const discord = new OAuth(code as string);

        try {
            await discord.validate(request);
            await discord.getUser();

            req.discord = discord;
            next();
        } catch (err) {
            res.status(500).json({
                success: false,
                error: err.message,
            });
        }
    };
};
