import { any, object, string } from 'joi';

export default object({
    type: string()
        .required(),

    domain: any()
        .required(),

    subdomain: string()
        .allow('')
        .optional(),
}).options({ abortEarly: false });
