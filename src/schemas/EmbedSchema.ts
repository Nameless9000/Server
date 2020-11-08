import { object, string } from 'joi';

export default object({
    title: string()
        .optional(),

    description: string()
        .optional(),

    color: string()
        .optional(),
}).options({ abortEarly: false });
