import { Request, Response, Router } from 'express';
import AdminMiddleware from '../middlewares/AdminMiddleware';
import AuthMiddleware from '../middlewares/AuthMiddleware';
import InviteModel from '../models/InviteModel';
import UserModel from '../models/UserModel';
import { generateInvite } from '../utils/GenerateUtil';
const router = Router();

router.get('/', AdminMiddleware, async (_req: Request, res: Response) => {
    const count = await InviteModel.countDocuments();

    const invites = await InviteModel.find({})
        .select('-__v');

    const redeemedInvites = await InviteModel.find({ redeemed: true })
        .select('-__v');

    const unusableInvites = await InviteModel.find({ useable: false })
        .select('-__v');

    res.json({
        success: true,
        count,
        invites,
        redeemedInvites,
        unusableInvites,
    });
});

router.post('/', AuthMiddleware, async (req: Request, res: Response) => {
    const { user } = req;

    if (user.invites <= 0) return res.status(401).json({
        success: false,
        error: 'you do not have any invites',
    });

    const invite = generateInvite();

    await InviteModel.create({
        _id: invite,
        createdBy: user.username,
        dateCreated: new Date(),
        dateRedeemed: null,
        usedBy: null,
        redeemed: false,
        useable: true,
    });

    await UserModel.findByIdAndUpdate(user._id, {
        invites: user.invites - 1,
    });

    res.status(200).json({
        success: true,
        link: `${process.env.FRONTEND_URL}/?code=${invite}`,
        code: invite,
    });
});

router.get('/:code', AdminMiddleware, async (req: Request, res: Response) => {
    const code = req.params.code as string;

    if (!code) return res.status(400).json({
        success: false,
        error: 'provide a code',
    });

    const invite = await InviteModel.findById(code)
        .select('-__v');

    if (!invite) return res.status(404).json({
        success: false,
        error: 'invalid invite code',
    });

    res.status(200).json({
        success: true,
        invite,
    });
});

export default router;
