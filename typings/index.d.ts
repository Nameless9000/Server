/* eslint-disable no-unused-vars */
import { User } from '../src/models/UserModel';

declare global {
    namespace Express {
        export interface Request {
            user: User;
        }
    }
}
