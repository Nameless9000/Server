import { hash } from 'argon2';
import { Request, Response, Router } from 'express';
import { v4 as uuid } from 'uuid';
import ValidationMiddleware from '../middlewares/ValidationMiddleware';
import InviteModel from '../models/InviteModel';
import UserModel from '../models/UserModel';
import RegisterSchema from '../schemas/RegisterSchema';
import { generateString } from '../utils/GenerateUtil';
import { sendVerificationEmail } from '../utils/MailUtil';
const router = Router();

router.post('/register', ValidationMiddleware(RegisterSchema), async (req: Request, res: Response) => {
    let { email, username, password, invite }: {
        email: string;
        username: string;
        password: string;
        invite: string;
    } = req.body;

    if (req.user) return res.status(400).json({
        success: false,
        error: 'you are already logged in',
    });

    const usernameTaken = await UserModel.findOne({ username: { $regex: new RegExp(username, 'i') } });

    if (usernameTaken) return res.status(400).json({
        success: false,
        error: 'the provided username is already taken',
    });

    const emailTaken = await UserModel.findOne({ email: { $regex: new RegExp(email, 'i') } });

    if (emailTaken) return res.status(400).json({
        success: false,
        error: 'an account has already been registered with this email',
    });

    const inviteDoc = await InviteModel.findById(invite);

    if (!inviteDoc || !inviteDoc.useable) return res.status(400).json({
        success: false,
        error: 'invalid invite code',
    });

    if (inviteDoc.redeemed) return res.status(400).json({
        success: false,
        error: 'this invite has already been redeemed',
    });

    let invitedBy = 'Admin';
    const inviter = await UserModel.findOne({ username: inviteDoc.createdBy });

    if (inviter) {
        invitedBy = inviter.username;

        await UserModel.findByIdAndUpdate(inviter._id, {
            $push: {
                invitedUsers: username,
            },
        });
    }

    password = await hash(password);

    try {
        const user = await UserModel.create({
            _id: uuid(),
            uid: 1,
            username,
            password,
            invite,
            key: `astral_${generateString(30)}`,
            email,
            emailVerified: false,
            emailVerificationKey: generateString(30),
            discord: {
                id: null,
                avatar: null,
            },
            blacklisted: {
                status: false,
                reason: null,
            },
            uploads: 0,
            invites: 0,
            invitedBy,
            invitedUsers: [],
            registrationDate: new Date(),
            testimonial: null,
            roles: ['whitelisted'],
            settings: {
                domain: {
                    name: 'i.astral.cool',
                    subdomain: null,
                },
                randomDomain: {
                    enabled: false,
                    domains: [],
                },
                embed: {
                    enabled: false,
                    color: null,
                    title: null,
                    description: null,
                    author: username,
                    randomColor: false,
                },
                showLink: false,
                invisibleUrl: false,
                longUrl: false,
            },
        });

        await sendVerificationEmail(user);

        await InviteModel.findByIdAndUpdate(invite, {
            usedBy: username,
            redeemed: true,
            useable: false,
        });

        res.status(200).json({
            success: true,
            message: 'registered successfully, check your email to verify',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

export default router;
