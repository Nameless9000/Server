/* eslint-disable no-unused-vars */
import { User } from '../src/models/UserModel';
import { DiscordUserInterface } from '../src/utils/interfaces/DiscordUserInterface';

declare global {
    namespace Express {
        export interface Request {
            user: User;
            discordUser: DiscordUserInterface;
        }
    }
}
