import { Request, Response, Router } from 'express';
import { generateInvite } from '../utils/GenerateUtil';
import AdminMiddleware from '../middlewares/AdminMiddleware';
import Invites from '../models/InviteModel';
import User from '../models/UserModel';
const router = Router();

router.post('/', async (req: Request, res: Response) => {
    let { user } = req;
    let useable = req.body.usable || true;
    let inviter = 'Admin';
    let amount = req.body.amount || 1;
    const key = req.headers.authorization as string;
    const invites = [];

    if (!user && key !== process.env.API_KEY) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    if (user && key !== process.env.API_KEY) {
        user = await User.findOne({ _id: req.user._id });

        if (!user || user._id !== req.user._id) return res.status(401).json({
            success: false,
            error: 'unauthorized',
        });

        if (user.invites <= 0) return res.status(401).json({
            success: false,
            error: 'you do not have any invites',
        });

        amount = 1;
        inviter = user.username;
        useable = true;
    }

    for (let i = 0; i < amount; i++) {
        const invite = generateInvite();
        invites.push({
            link: `https://astral.cool/?code=${invite}`,
            code: invite,
        });

        await Invites.create({
            _id: invite,
            createdBy: inviter,
            dateCreated: new Date().toLocaleDateString(),
            useable,
            usedBy: null,
            redeemed: false,
        });

        if (user && key !== process.env.API_KEY) {
            await User.updateOne({ _id: user._id }, {
                $push: {
                    createdInvites: {
                        code: invite,
                        dateCreated: new Date().toLocaleDateString(),
                        useable: true,
                    },
                },
                invites: user.invites - 1,
            });
        }
    }

    res.status(200).json({
        success: true,
        invites,
    });
});

router.delete('/:code', async (req: Request, res: Response) => {
    const code = req.params.code;

    if (!code) return res.status(400).json({
        success: false,
        error: 'provide a code',
    });

    const invite = await Invites.findOne({ _id: code });

    if (!invite) res.status(404).json({
        success: false,
        error: 'invalid invite code',
    });

    if (!invite.useable) return res.status(400).json({
        success: false,
        error: 'this invite is not useable',
    });

    await Invites.updateOne({ _id: code }, {
        useable: false,
    }).then(async () => {
        await User.updateOne({ 'username': invite.createdBy, 'createdInvites.code': invite._id }, {
            'createdInvites.$.useable': false,
        });

        res.status(200).json({
            success: true,
            message: 'made invite unuseable',
        });
    }).catch((err) => {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    });
});

router.get('/:code', AdminMiddleware, async (req: Request, res: Response) => {
    const code = req.params.code;

    if (!code) return res.status(400).json({
        success: false,
        error: 'provide a code',
    });

    let invite = await Invites.findOne({ _id: code });

    if (!invite) return res.status(404).json({
        success: false,
        error: 'invalid code',
    });

    invite = invite.toObject();
    invite['code'] = invite._id;
    delete invite.__v;
    delete invite._id;

    res.status(200).json({
        success: true,
        invite,
    });
});

export default router;
