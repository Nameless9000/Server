import { prop, getModelForClass, modelOptions } from '@typegoose/typegoose';

@modelOptions({ options: { allowMixed: 0 } })
export class Counter {
    /**
     * The counter identifier.
     */
    @prop()
    _id: string;

    /**
     * The current count.
     */
    @prop()
    count: number;
}

export default getModelForClass(Counter);
