import { boolean, object } from 'joi';

export default object({
    showLink: boolean()
        .optional(),

    invisibleUrl: boolean()
        .optional(),

    randomDomain: boolean()
        .optional(),

    embed: boolean()
        .optional(),
}).options({ abortEarly: false });
