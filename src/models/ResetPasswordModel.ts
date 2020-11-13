import { prop, getModelForClass, modelOptions } from '@typegoose/typegoose';

@modelOptions({ options: { allowMixed: 0 } })
export class ResetPassword {
    /**
     * The reset code.
     */
    @prop()
    _id: string;

    /**
     * The user's uuid.
     */
    @prop()
    user: string;

    /**
     * The user's email.
     */
    @prop()
    email: string;
}

export default getModelForClass(ResetPassword);
