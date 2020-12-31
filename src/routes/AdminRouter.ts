import { Request, Response, Router } from 'express';
import { generateInvite } from '../utils/GenerateUtil';
import AdminMiddleware from '../middlewares/AdminMiddleware';
import InviteModel from '../models/InviteModel';
import ValidationMiddleware from '../middlewares/ValidationMiddleware';
import BlacklistSchema from '../schemas/BlacklistSchema';
import UserModel from '../models/UserModel';
const router = Router();

router.use(AdminMiddleware);

router.post('/invites', async (req: Request, res: Response) => {
    const { user } = req;
    const invite = generateInvite();
    const dateCreated = new Date();

    try {
        await InviteModel.create({
            _id: invite,
            createdBy: {
                username: user ? user.username : 'Admin',
                uuid: user ? user._id : 'N/A',
            },
            dateCreated,
            dateRedeemed: null,
            usedBy: null,
            redeemed: false,
            useable: true,
        });

        res.status(200).json({
            success: true,
            link: `https://astral.gifts/${invite}`,
            code: invite,
            dateCreated,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.post('/blacklist', ValidationMiddleware(BlacklistSchema), async (req: Request, res: Response) => {
    const { id, reason } = req.body;

    try {
        // this next line is lol, just lol.
        const user = await UserModel.findById(id) || await UserModel.findOne({ username: id }) || await UserModel.findOne({ email: id }) || await UserModel.findOne({ invite: id }) || await UserModel.findOne({ key: id }) || await UserModel.findOne({ 'discord.id': id.replace('<@!', '').replace('>', '') });

        if (!user) return res.status(404).json({
            success: false,
            error: 'invalid user',
        });

        if (user.blacklisted.status) return res.status(400).json({
            success: false,
            error: 'this user is already blacklisted',
        });

        await UserModel.findByIdAndUpdate(user._id, {
            blacklisted: {
                status: true,
                reason: reason ? reason : 'No reason provided',
            },
        });

        res.status(200).json({
            success: true,
            message: 'blacklisted user successfully',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.get('/users/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const user = await UserModel.findById(id) || await UserModel.findOne({ username: id }) || await UserModel.findOne({ 'discord.id': id.replace('<@!', '').replace('>', '') }) || await UserModel.findOne({ uid: parseInt(id) || null });

        if (!user) return res.status(404).json({
            success: false,
            error: 'invalid user',
        });

        res.status(200).json({
            success: true,
            user: {
                username: user.username,
                uuid: user._id,
                lastLogin: user.lastLogin,
                uid: user.uid,
                uploads: user.uploads,
                registrationDate: user.registrationDate,
                invitedBy: user.invitedBy,
            },
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

export default router;
