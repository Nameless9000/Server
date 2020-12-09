import { boolean, object, string } from 'joi';

export default object({
    color: string()
        .optional(),

    title: string()
        .optional()
        .allow(''),

    description: string()
        .optional()
        .allow(''),

    author: string()
        .optional()
        .allow(''),

    randomColor: boolean()
        .optional(),
}).options({ abortEarly: false });
