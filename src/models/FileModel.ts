import { prop, getModelForClass, modelOptions } from '@typegoose/typegoose';

@modelOptions({ options: { allowMixed: 0 } })
export class File {
    /**
     * The file's name.
     */
    @prop()
    filename: string;

    /**
     * The file's original name.
     */
    @prop()
    originalname: string;

    /**
     * The file's mimetype.
     */
    @prop()
    mimetype: string;

    /**
     * The date the file was uploaded.
     */
    @prop()
    dateUploaded: string;

    /**
     * The file's deletion key.
     */
    @prop()
    deletionKey: string;

    /**
     * The file's display type.
     */
    @prop()
    displayType: 'embed' | 'raw';

    /**
     * The file's embed settings, if enabled.
     */
    @prop()
    embed: {
        color: string;
        title: string;
        description: string;
    }

    /**
     * Whether or not the file's link should show in discord.
     */
    @prop()
    showLink: boolean;

    /**
     * The username of the user who uploaded the file.
     */
    @prop()
    uploader: {
        username: string;
        uid: string;
    };
}

export default getModelForClass(File);
