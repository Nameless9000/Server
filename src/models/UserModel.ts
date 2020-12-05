import { prop, getModelForClass, modelOptions } from '@typegoose/typegoose';

@modelOptions({ options: { allowMixed: 0 } })
export class User {
    /**
     * The user's uuid.
     */
    @prop()
    _id: string;

    /**
     * The user's username.
     */
    @prop()
    username: string;

    /**
     * The user's password.
     */
    @prop()
    password: string;

    /**
     * The user's email.
     */
    @prop()
    email: string;

    /**
     * Whether or not the user's email is verified.
     */
    @prop()
    emailVerified: boolean;

    /**
     * The user's email verification key.
     */
    @prop()
    emailVerificationKey: string;

    /**
     * The user's invite code.
     */
    @prop()
    invite: string;

    /**
     * The user's upload key.
     */
    @prop()
    key: string;

    /**
     * The user's discord id and avatar.
     */
    @prop()
    discord: {
        id: string;
        avatar: string;
    };

    /**
     * The user's blacklist status and reason.
     */
    @prop()
    blacklisted: {
        status: boolean;
        reason: string;
    };

    /**
     * The amount of files the user has uploaded.
     */
    @prop()
    uploads: number;

    /**
     * The amount of invites the user has.
     */
    @prop()
    invites: number;

    /**
     * The user that the user was invited by.
     */
    @prop()
    invitedBy: string;

    /**
     * The users that the user invited.
     */
    @prop({ type: () => [String] })
    invitedUsers: string[];

    /**
     * The date that the user registered.
     */
    @prop()
    registrationDate: Date;

    /**
     * The user's testimonial.
     */
    @prop()
    testimonial: string;

    /**
     * The user's roles.
     */
    @prop({ type: () => [String] })
    roles: string[];

    /**
     * The user's settings, their preferences, their domain, etc.
     */
    @prop()
    settings: {
        domain: {
            name: string;
            subdomain: string;
        };
        randomDomain: {
            enabled: boolean;
            domains: string[];
        },
        embed: {
            enabled: boolean;
            color: string;
            title: string;
            description: string;
            author: string;
            randomColor: boolean;
        };
        showLink: boolean;
        invisibleUrl: boolean;
        longUrl: boolean;
    };
}

export default getModelForClass(User);
