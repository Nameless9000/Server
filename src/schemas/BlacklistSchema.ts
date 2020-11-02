import { object, string } from 'joi';

export default object({
    reason: string()
        .min(3),
}).options({ abortEarly: false });
