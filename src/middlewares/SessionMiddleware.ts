import { NextFunction, Request, Response } from 'express';
import { verify } from 'jsonwebtoken';

export default (req: Request, _res: Response, next: NextFunction) => {
    const jwt = req.cookies['x-auth-token'];

    if (!jwt) return next();

    try {
        const token: any = verify(jwt, process.env.REFRESH_TOKEN_SECRET);
        req.user = token;

        next();
    } catch (err) {
        next();
    }
};
