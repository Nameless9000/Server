import { NextFunction, Request, Response } from 'express';
import { verify } from 'jsonwebtoken';

export default (req: Request, _res: Response, next: NextFunction) => {
    const jwt = req.headers.cookie;

    if (!jwt) return next();

    try {
        const token: any = verify(jwt.split('jwt=')[1], process.env.JWT_SECRET);
        req.user = token;
        next();
    } catch (err) {
        next();
    }
};
