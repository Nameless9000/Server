import { object, string } from 'joi';

export default object({
    name: string()
        .required(),

    wildcard: string()
        .required(),

    donated: string(),

    donatedBy: string(),
}).options({ abortEarly: false });
