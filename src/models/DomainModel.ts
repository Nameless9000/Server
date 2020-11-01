import { prop, getModelForClass, modelOptions } from '@typegoose/typegoose';

@modelOptions({ options: { allowMixed: 0 } })
export class Domain {
    /**
     * The domain name.
     */
    @prop()
    name: string;

    /**
     * If the domain is wildcarded or not.
     */
    @prop()
    wildcard: boolean;

    /**
     * If the domain was donated or not.
     */
    @prop()
    donated: boolean;

    /**
     * Who donated the domain.
     */
    @prop()
    donatedBy: string;

    /**
     * The date the domain was added.
     */
    @prop()
    dateAdded: string;
}

export default getModelForClass(Domain);
