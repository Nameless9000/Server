import { prop, getModelForClass, modelOptions } from '@typegoose/typegoose';

@modelOptions({ options: { allowMixed: 0 } })
export class Invite {
    /**
     * The invite code.
     */
    @prop()
    _id: string;

    /**
     * The user who created the invite.
     */
    @prop()
    createdBy: string;

    /**
     * The date the invite was created.
     */
    @prop()
    dateCreated: string;

    /**
     * Whether or not the invite is useable.
     */
    @prop()
    useable: boolean;

    /**
     * The user who claimed the invite.
     */
    @prop()
    usedBy: string;

    /**
     * WHether or not the invite was redeemed.
     */
    @prop()
    redeemed: boolean;
}

export default getModelForClass(Invite);
