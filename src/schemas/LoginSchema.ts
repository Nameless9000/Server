import { object, string } from 'joi';

export default object({
    username: string()
        .alphanum()
        .required(),

    password: string()
        .pattern(new RegExp('^[a-zA-Z0-9]{3,30}$'))
        .required(),
}).options({ abortEarly: false });

