import { prop, getModelForClass, modelOptions } from '@typegoose/typegoose';

@modelOptions({ options: { allowMixed: 0 } })
export class ShortUrl {
    /**
     * The short url id.
     */
    @prop()
    _id: string;

    /**
     * The original file name.
     */
    @prop()
    filename: string;

    /**
     * The uid of th creator of the url.
     */
    @prop()
    uid: string;
}

export default getModelForClass(ShortUrl);
