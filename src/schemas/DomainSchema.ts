import { array, boolean, object, string } from 'joi';

export default array().items(object({
    name: string()
        .required(),

    wildcard: boolean()
        .required(),

    donated: boolean(),

    donatedBy: string(),
}).options({ abortEarly: false }));
