import { NextFunction, Request, Response } from 'express';

export default async (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers.authorization as string;

    if (!key) return res.status(400).json({
        success: false,
        error: 'Provide an api-key.',
    });

    if (key !== process.env.API_KEY) return res.status(401).json({
        success: false,
        error: 'Unauthorized.',
    });

    next();
};
