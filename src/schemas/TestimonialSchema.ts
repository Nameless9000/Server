import { object, string } from 'joi';

export default object({
    testimonial: string()
        .min(5)
        .required(),
}).options({ abortEarly: false });
