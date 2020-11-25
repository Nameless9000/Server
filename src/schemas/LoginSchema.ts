import { object, string } from 'joi';

export default object({
    username: string()
        .alphanum()
        .required(),

    password: string()
        .min(5)
        .max(30)
        .required(),
}).options({ abortEarly: false });

