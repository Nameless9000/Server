import { object, string } from 'joi';

export default object({
    id: string()
        .required(),

    reason: string()
        .required(),
}).options({ abortEarly: false });
