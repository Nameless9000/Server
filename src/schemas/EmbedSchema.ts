import { boolean, object, string } from 'joi';

export default object({
    title: string()
        .optional()
        .allow(''),

    description: string()
        .optional()
        .allow(''),

    color: string()
        .optional(),

    author: boolean()
        .optional(),

    randomColor: boolean()
        .optional(),
}).options({ abortEarly: false });
