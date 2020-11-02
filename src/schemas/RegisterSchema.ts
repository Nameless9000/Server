import { object, string } from 'joi';

export default object({
    email: string()
        .email()
        .required(),

    username: string()
        .alphanum()
        .min(3)
        .max(30)
        .required(),

    password: string()
        .pattern(new RegExp('^[a-zA-Z0-9]{3,30}$'))
        .min(5)
        .max(30)
        .required(),

    invite: string()
        .required(),
}).options({ abortEarly: false });

