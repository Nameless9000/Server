import { object, string } from 'joi';

export default object({
    code: string()
        .required(),
}).options({ abortEarly: false });
