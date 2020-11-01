import { Request, Response, Router } from 'express';
import { generateInvite } from '../utils/GenerateUtil';
import AdminMiddleware from '../middlewares/AdminMiddleware';
import Invites from '../models/InviteModel';
const router = Router();

router.post('/', AdminMiddleware, async (req: Request, res: Response) => {
    const amount = req.body.amount || 1;
    const inviter = req.body.inviter || 'Unknown';
    const useable = req.body.usable || true;
    const invites = [];

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
    }

    res.status(200).json({
        success: true,
        invites,
    });
});

router.delete('/:code', AdminMiddleware, async (req: Request, res: Response) => {
    const code = req.params.code;

    if (!code) return res.status(400).json({
        success: false,
        error: 'Provide a code.',
    });

    const invite = await Invites.findOne({ _id: code });

    if (!invite) res.status(404).json({
        success: false,
        error: 'Invalid invite code.',
    });

    if (!invite.useable) return res.status(400).json({
        success: false,
        error: 'This invite is not useable.',
    });

    await Invites.updateOne({ _id: code }, {
        useable: false,
    }).then(() => {
        res.status(200).json({
            success: true,
            message: 'Made invite unuseable.',
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
        error: 'Provide a code.',
    });

    let invite = await Invites.findOne({ _id: code });

    if (!invite) return res.status(404).json({
        success: false,
        error: 'Invalid code.',
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
