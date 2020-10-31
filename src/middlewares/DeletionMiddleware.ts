import { NextFunction, Request, Response } from 'express';
import Files from '../models/FileModel';

export default async (req: Request, res: Response, next: NextFunction) => {
    const deletionKey = req.query.key as string;

    if (!deletionKey) return res.status(400).json({
        success: false,
        error: 'Provide a deletion key.',
    });

    const file = await Files.findOne({ deletionKey });

    if (!file) return res.status(404).json({
        success: false,
        error: 'Invalid deletion key.',
    });

    next();
};
