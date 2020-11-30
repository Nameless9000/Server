import { NextFunction, Request, Response } from 'express';
import { ObjectSchema } from 'joi';

export default (schema: ObjectSchema, property: 'body' | 'query' = 'body') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.validateAsync(req[property]);
            next();
        } catch (err) {
            res.status(400).json({
                success: false,
                error: err.details.map((x: any) => x.message.replace(/"/gi, '')).join(', '),
            });
        }
    };
};
