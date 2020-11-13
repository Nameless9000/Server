import { object, string } from 'joi';

export default object({
    key: string()
        .required(),

    password: string()
        .pattern(new RegExp('^[a-zA-Z0-9]{3,30}$'))
        .min(5)
        .max(30)
        .required(),

    confirmPassword: string()
        .pattern(new RegExp('^[a-zA-Z0-9]{3,30}$'))
        .min(5)
        .max(30)
        .required(),
}).options({ abortEarly: false });

