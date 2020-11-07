import { Request, Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateString } from '../utils/GenerateUtil';
import { hash, verify } from 'argon2';
import { sendVerificationEmail } from '../utils/MailUtil';
import { oAuth } from '../utils/oAuth2Util';
import { sign } from 'jsonwebtoken';
import JoiMiddleware from '../middlewares/JoiMiddleware';
import RegisterSchema from '../schemas/RegisterSchema';
import Users from '../models/UserModel';
import Invites from '../models/InviteModel';
import VerifySchema from '../schemas/VerifySchema';
import LoginSchema from '../schemas/LoginSchema';
import CallbackSchema from '../schemas/CallbackSchema';
const router = Router();

router.post('/register', JoiMiddleware(RegisterSchema, 'body'), async (req: Request, res: Response) => {
    const { email, username, password, invite }: {
        email: string,
        username: string,
        password: string,
        invite: string
    } = req.body;

    if (req.user) return res.status(400).json({
        success: false,
        error: 'you are already logged in',
    });

    const userExists = await Users.findOne({ username: { $regex: new RegExp(username, 'i') } });

    if (userExists) return res.status(400).json({
        success: false,
        error: 'this username is already in use',
    });

    const emailExists = await Users.findOne({ email: { $regex: new RegExp(email, 'i') } });

    if (emailExists) return res.status(400).json({
        success: false,
        error: 'this email is already in use',
    });

    const queriedInvite = await Invites.findOne({ _id: invite });

    if (!queriedInvite) return res.status(400).json({
        success: false,
        error: 'invalid invite code',
    });

    if (queriedInvite.redeemed) return res.status(400).json({
        success: false,
        error: 'this invite has already been redeemed',
    });

    if (!queriedInvite.useable) return res.status(400).json({
        success: false,
        error: 'this invite is not usable',
    });

    let invitedBy = 'Unknown';

    if (queriedInvite.createdBy !== 'Unknown') {
        const inviter = await Users.findOne({ _id: queriedInvite.createdBy });

        if (!inviter) return;

        invitedBy = inviter.username;

        await Users.updateOne({ _id: inviter._id }, {
            $push: {
                invitedUsers: username,
            },
        });
    }

    await Users.create({
        _id: uuidv4(),
        username,
        password: await hash(password),
        email,
        emailVerified: false,
        emailVerificationKey: generateString(30),
        invite,
        key: `astral_${generateString(20)}`,
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
        createdInvites: [],
        invitedUsers: [],
        registrationDate: new Date().toLocaleDateString(),
        testimonial: null,
        roles: ['whitelisted'],
        settings: {
            showLink: false,
            invisibleUrl: false,
            domain: {
                name: 'astral.cool',
                subdomain: null,
            },
            embed: {
                enabled: false,
                color: null,
                title: null,
                description: null,
            },
        },
    }).then((user) => {
        // set session
        sendVerificationEmail(user)
            .then(async () => {
                res.status(200).json({
                    success: true,
                    message: 'registered successfully, please check your email to verify',
                });

                await Invites.updateOne({ _id: invite }, {
                    usedBy: username,
                    redeemed: true,
                });
            }).catch((err) => {
                res.status(500).json({
                    success: false,
                    error: err.message,
                });
            });
    }).catch((err) => {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    });
});

router.get('/verify', JoiMiddleware(VerifySchema, 'query'), async (req: Request, res: Response) => {
    const key = req.query.key as string;

    const user = await Users.findOne({ emailVerificationKey: key });

    if (!user) return res.status(404).json({
        success: false,
        error: 'invalid verification key',
    });

    if (user.emailVerified) return res.status(400).json({
        success: false,
        error: 'your email is already verified',
    });

    await Users.updateOne({ emailVerificationKey: key }, {
        emailVerified: true,
    }).then(() => {
        res.status(200).json({
            success: true,
            message: 'verified email successfully',
        });
    }).catch((err) => {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    });
});

router.post('/login', JoiMiddleware(LoginSchema, 'body'), async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (req.user) return res.status(400).json({
        success: false,
        error: 'you are already logged in',
    });

    let user = await Users.findOne({ username });

    if (!user) return res.status(401).json({
        success: false,
        error: 'invalid username',
    });

    if (!user.emailVerified) return res.status(401).json({
        success: false,
        error: 'your email is not verified',
    });

    const validPassword = await verify(user.password, password);

    if (!validPassword) return res.status(401).json({
        success: false,
        error: 'invalid password',
    });

    user = user.toObject({ versionKey: false });
    delete user.password;

    const token = sign({ _id: user._id }, process.env.JWT_SECRET);

    res.cookie('jwt', token, { httpOnly: true, secure: false });

    res.status(200).json({
        success: true,
        message: 'logged in',
    });
});

router.get('/logout', (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    res.clearCookie('jwt');

    res.status(200).json({
        success: true,
        message: 'logged out',
    });
});

router.get('/discord/link', (req: Request, res: Response) => {
    req.user ?
        res.redirect(process.env.DISCORD_OAUTH_URL) :
        res.status(401).json({
            success: false,
            error: 'unauthorized',
        });
});

router.get('/discord/callback', JoiMiddleware(CallbackSchema, 'query'), async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    const code = req.query.code as string;
    const discord = new oAuth(code);

    const validCode = await discord.validCode();

    if (!validCode) return res.status(400).json({
        success: false,
        error: 'invalid oauth code',
    });

    const user = await discord.getUser();

    if (!user) return res.status(400).json({
        success: false,
        error: 'something went wrong',
    });

    const findUser = await Users.findOne({ _id: req.user._id });

    if (!findUser) return res.status(400).json({
        success: false,
        error: 'invalid session',
    });

    if (!findUser.emailVerified) return res.status(401).json({
        success: false,
        error: 'your email is not verified',
    });

    const addToGuild = await discord.addGuildMember(findUser);

    if (addToGuild.error !== null && !addToGuild.success) return res.status(500).json({
        success: false,
        error: addToGuild.error,
    });

    await Users.updateOne({ _id: req.user._id }, {
        discord: {
            id: user.id,
            avatar: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
        },
    }).then(() => {
        res.redirect('http://localhost:3000/dashboard');
    }).catch((err) => {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    });
});

export default router;
